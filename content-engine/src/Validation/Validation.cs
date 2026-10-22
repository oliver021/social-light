using SocialLight.ContentEngine.Infrastructure;
using SocialLight.ContentEngine.Model;

namespace SocialLight.ContentEngine.Validation;

/// <summary>
/// The known operation kinds and their required <c>Data</c> fields. This is the
/// hand-written v0 catalog; the target (see README) is to derive it per module
/// from the app-specs via code-engine so it can never drift from the API.
/// </summary>
public static class OpCatalog
{
    public static readonly IReadOnlySet<string> Kinds = new HashSet<string>
    {
        "profile.edit",
        "socialgraph.friend.create",
        "posts.post.create",
        "posts.postmedia.create",
        "engagement.comment.create",
        "engagement.reaction.add",
        "chat.chat.create",
        "chat.message.send",
    };

    public static string[] RequiredData(string kind) => kind switch
    {
        "profile.edit" => ["displayName"],
        "socialgraph.friend.create" => ["requester", "recipient", "status"],
        "posts.post.create" => ["body"],
        "posts.postmedia.create" => ["postId", "fileUrl", "mediaType"],
        "engagement.comment.create" => ["targetType", "targetId", "body"],
        "engagement.reaction.add" => ["targetType", "targetId", "reactionType"],
        "chat.chat.create" => ["type"],
        "chat.message.send" => ["content"],
        _ => [],
    };
}

/// <summary>
/// Validates that a seed is internally consistent and pushable: known kinds,
/// resolvable refs (in dependency order), unique produced refs, and required
/// content present. A committed seed should always pass.
/// </summary>
public static class SeedValidator
{
    public static IReadOnlyList<string> Validate(
        IReadOnlyList<SeedActor> actors, IReadOnlyList<SeedOperation> operations)
    {
        var errors = new List<string>();
        var actorRefs = actors.Select(a => a.Ref).ToHashSet();
        var produced = new HashSet<string>(actorRefs); // actors exist before any op runs

        for (var i = 0; i < operations.Count; i++)
        {
            var op = operations[i];
            var at = $"operations[{i}] ({op.Kind})";

            if (!OpCatalog.Kinds.Contains(op.Kind))
                errors.Add($"{at}: unknown kind");

            if (!actorRefs.Contains(op.As))
                errors.Add($"{at}: 'as' {op.As} is not a declared actor");

            foreach (var dep in Dependencies(op))
                if (!produced.Contains(dep))
                    errors.Add($"{at}: unresolved ref {dep}");

            foreach (var field in OpCatalog.RequiredData(op.Kind))
                if (string.IsNullOrWhiteSpace(Json.AsString(op.Data.GetValueOrDefault(field))))
                    errors.Add($"{at}: missing or empty data.{field}");

            if (op.Ref is not null && !produced.Add(op.Ref))
                errors.Add($"{at}: duplicate ref {op.Ref}");
        }

        return errors;
    }

    /// <summary>Refs this operation depends on existing first (entities + participants).</summary>
    private static IEnumerable<string> Dependencies(SeedOperation op)
    {
        if (op.On is not null) yield return op.On;
        if (op.In is not null) yield return op.In;
        if (op.With is not null)
            foreach (var w in op.With)
                yield return w;
    }
}
