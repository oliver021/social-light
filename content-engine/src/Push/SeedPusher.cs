using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using SocialLight.ContentEngine.Infrastructure;
using SocialLight.ContentEngine.Model;

namespace SocialLight.ContentEngine.Push;

/// <summary>
/// Stage 2: replays a seed against the social API as the public surface a real
/// client uses. Resolves symbolic refs (@alice, @p1, @media:…) to the ids/URLs the
/// backend assigns, recording them in a manifest.
///
/// Before replaying content ops, an optional media pre-step uploads every file in
/// <c>mediaDir</c> to the media service and populates <c>@media:&lt;filename&gt;</c>
/// refs so that <c>profile.edit.avatarUrl</c> and <c>posts.postmedia.create.fileUrl</c>
/// resolve to stable content-addressed URLs.
/// </summary>
public sealed class SeedPusher(Uri api, Uri identity)
{
    public async Task<(Manifest Manifest, TokenSet Tokens)> PushAsync(
        string runId, string scenario, IReadOnlyList<SeedActor> actors,
        IReadOnlyList<SeedOperation> operations, string? mediaDir, CancellationToken ct)
    {
        var refs = new Dictionary<string, string>();
        var errors = new List<string>();
        var tokens = new Dictionary<string, string>();

        using var http = new HttpClient { BaseAddress = api };
        using var idp = new HttpClient { BaseAddress = identity };
        var provisioner = new ActorProvisioner(idp);

        // 1) Provision actors (signup + login) so each op can act as its principal.
        foreach (var actor in actors)
        {
            try
            {
                var (userId, token) = await provisioner.EnsureAsync(actor, ct);
                tokens[actor.Ref] = token;
                refs[actor.Ref] = userId;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                errors.Add($"actor {actor.Ref} ({actor.Handle}): provisioning failed — {ex.Message}");
            }
        }

        // 2) Upload media files and populate @media:<filename> → URL refs.
        if (mediaDir is not null && Directory.Exists(mediaDir))
        {
            foreach (var file in Directory.GetFiles(mediaDir))
            {
                try
                {
                    var url = await UploadMediaAsync(http, file, ct);
                    refs[$"@media:{Path.GetFileName(file)}"] = url;
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    errors.Add($"media upload {Path.GetFileName(file)}: {ex.Message}");
                }
            }
        }

        // 3) Replay operations in authored order, resolving refs as we go.
        for (var i = 0; i < operations.Count; i++)
        {
            var op = operations[i];
            if (!tokens.TryGetValue(op.As, out var token))
            {
                errors.Add($"operations[{i}] ({op.Kind}): skipped — actor {op.As} has no token");
                continue;
            }

            try
            {
                var id = await ExecuteAsync(http, token, op, refs, ct);
                if (op.Ref is not null && id is not null)
                    refs[op.Ref] = id;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                errors.Add($"operations[{i}] ({op.Kind}): {ex.Message}");
            }
        }

        var now = DateTimeOffset.UtcNow;
        return (new Manifest(scenario, now, refs, errors), new TokenSet(runId, now, tokens));
    }

    private static async Task<string?> ExecuteAsync(
        HttpClient http, string token, SeedOperation op, Dictionary<string, string> refs, CancellationToken ct)
    {
        string? Resolve(object? value)
        {
            var s = Json.AsString(value);
            return s is not null && s.StartsWith('@') ? refs.GetValueOrDefault(s, s) : s;
        }

        switch (op.Kind)
        {
            case "profile.edit":
                await PutAsync(http, token, "/api/profiles/me", new
                {
                    displayName = Json.AsString(op.Data.GetValueOrDefault("displayName")),
                    bio = Json.AsString(op.Data.GetValueOrDefault("bio")),
                    avatarUrl = Resolve(op.Data.GetValueOrDefault("avatarUrl")),
                    handle = Json.AsString(op.Data.GetValueOrDefault("handle")),
                    location = Json.AsString(op.Data.GetValueOrDefault("location")),
                }, ct);
                return null;

            case "socialgraph.friend.create":
                // The v0 Create handler trusts the body ids (the "bind owner from
                // principal" comment is template boilerplate it doesn't yet enforce),
                // so we pass both resolved actor ids; any actor's token authorizes it.
                return await PostForIdAsync(http, token, "/api/friends", new
                {
                    requesterId = Resolve(op.Data.GetValueOrDefault("requester")),
                    recipientId = Resolve(op.Data.GetValueOrDefault("recipient")),
                    status = Json.AsString(op.Data.GetValueOrDefault("status")) ?? "accepted",
                    acceptedAt = DateTime.UtcNow,
                }, ct);

            case "posts.post.create":
                return await PostForIdAsync(http, token, "/api/posts", new
                {
                    contentType = Json.AsString(op.Data.GetValueOrDefault("contentType")),
                    visibility = Json.AsString(op.Data.GetValueOrDefault("visibility")),
                    status = Json.AsString(op.Data.GetValueOrDefault("status")) ?? "published",
                    body = Json.AsString(op.Data.GetValueOrDefault("body")),
                }, ct);

            case "posts.postmedia.create":
                return await PostForIdAsync(http, token, "/api/post-medias", new
                {
                    postId = Resolve(op.Data.GetValueOrDefault("postId")),
                    fileUrl = Resolve(op.Data.GetValueOrDefault("fileUrl")),
                    mediaType = Json.AsString(op.Data.GetValueOrDefault("mediaType")),
                    position = Json.AsInt(op.Data.GetValueOrDefault("position")),
                }, ct);

            case "engagement.comment.create":
                return await PostForIdAsync(http, token, "/api/comments", new
                {
                    targetType = Json.AsString(op.Data.GetValueOrDefault("targetType")),
                    targetId = Resolve(op.Data.GetValueOrDefault("targetId")),
                    body = Json.AsString(op.Data.GetValueOrDefault("body")),
                }, ct);

            case "engagement.reaction.add":
                return await PostForIdAsync(http, token, "/api/reactions", new
                {
                    targetType = Json.AsString(op.Data.GetValueOrDefault("targetType")),
                    targetId = Resolve(op.Data.GetValueOrDefault("targetId")),
                    reactionType = Json.AsString(op.Data.GetValueOrDefault("reactionType")),
                }, ct);

            case "chat.chat.create":
                var participants = (op.With ?? []).Select(r => refs.GetValueOrDefault(r, r)).ToArray();
                return await PostForIdAsync(http, token, "/api/chats", new
                {
                    type = Json.AsString(op.Data.GetValueOrDefault("type")),
                    participantIds = participants,
                }, ct);

            case "chat.message.send":
                var chatId = op.In is not null ? refs.GetValueOrDefault(op.In, op.In) : null;
                return await PostForIdAsync(http, token, $"/api/chats/{chatId}/messages", new
                {
                    contentType = Json.AsString(op.Data.GetValueOrDefault("contentType")),
                    content = Json.AsString(op.Data.GetValueOrDefault("content")),
                }, ct);

            default:
                throw new InvalidOperationException($"no push binding for kind '{op.Kind}'");
        }
    }

    /// <summary>
    /// Uploads a local file to <c>POST /api/v1/media</c> and returns the
    /// content-addressed URL (<c>/blobs/…</c>) that can be stored on social entities.
    /// </summary>
    private static async Task<string> UploadMediaAsync(HttpClient http, string filePath, CancellationToken ct)
    {
        var contentType = GuessContentType(Path.GetExtension(filePath));
        await using var stream = File.OpenRead(filePath);

        using var content = new MultipartFormDataContent();
        var fileContent = new StreamContent(stream);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        content.Add(fileContent, "file", Path.GetFileName(filePath));

        using var resp = await http.PostAsync("/api/v1/media", content, ct);
        if (!resp.IsSuccessStatusCode)
        {
            var detail = await resp.Content.ReadAsStringAsync(ct);
            throw new InvalidOperationException($"{(int)resp.StatusCode} — {Truncate(detail, 200)}");
        }

        var el = await resp.Content.ReadFromJsonAsync<JsonElement>(Json.Options, ct);
        return el.GetProperty("url").GetString()
               ?? throw new InvalidOperationException("media response missing 'url'");
    }

    private static string GuessContentType(string ext) => ext.ToLowerInvariant() switch
    {
        ".svg" => "image/svg+xml",
        ".jpg" or ".jpeg" => "image/jpeg",
        ".png" => "image/png",
        ".webp" => "image/webp",
        ".gif" => "image/gif",
        _ => "application/octet-stream",
    };

    private static async Task PutAsync(HttpClient http, string token, string path, object body, CancellationToken ct)
    {
        using var msg = new HttpRequestMessage(HttpMethod.Put, path)
        {
            Content = JsonContent.Create(body, options: Json.Options),
        };
        msg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        using var resp = await http.SendAsync(msg, ct);
        if (!resp.IsSuccessStatusCode)
        {
            var detail = await resp.Content.ReadAsStringAsync(ct);
            throw new InvalidOperationException($"{(int)resp.StatusCode} {resp.ReasonPhrase} — {Truncate(detail, 200)}");
        }
    }

    private static async Task<string?> PostForIdAsync(
        HttpClient http, string token, string path, object body, CancellationToken ct)
    {
        using var msg = new HttpRequestMessage(HttpMethod.Post, path)
        {
            Content = JsonContent.Create(body, options: Json.Options),
        };
        msg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        using var resp = await http.SendAsync(msg, ct);
        if (!resp.IsSuccessStatusCode)
        {
            var detail = await resp.Content.ReadAsStringAsync(ct);
            throw new InvalidOperationException($"{(int)resp.StatusCode} {resp.ReasonPhrase} — {Truncate(detail, 200)}");
        }

        if (resp.Content.Headers.ContentLength is 0 or null)
            return null;

        var el = await resp.Content.ReadFromJsonAsync<JsonElement>(Json.Options, ct);
        return el.ValueKind == JsonValueKind.Object && el.TryGetProperty("id", out var id)
            ? id.GetString() ?? id.ToString()
            : null;
    }

    private static string Truncate(string s, int max) =>
        s.Length <= max ? s : s[..max] + "…";
}
