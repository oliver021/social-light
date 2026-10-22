using SocialLight.ContentEngine.Inference;
using SocialLight.ContentEngine.Io;
using SocialLight.ContentEngine.Media;
using SocialLight.ContentEngine.Model;

namespace SocialLight.ContentEngine.Generation;

/// <summary>
/// Expands a <see cref="ScenarioPlan"/> into a normalized operation graph plus a
/// set of generation units.
///
/// The discipline: the operation <b>graph</b> (which actors, which posts, who
/// comments on what, conversation turns, refs, ordering, timing) is built
/// deterministically from the RNG seed — pure code. The LLM only fills <b>leaf
/// text</b> (backstory, bio, post bodies, comments, DM lines). That is how "LLM
/// intent" is normalized: a completion is a string dropped into a known slot, so
/// the seed is schema-valid by construction.
///
/// When an <see cref="IMediaSource"/> is provided, the author also:
/// <list type="bullet">
/// <item>Generates avatar bytes per persona and emits a <c>profile.edit</c> op
///   that carries the bio (from the LLM) + the avatar URL (<c>@media:…</c> ref,
///   resolved by the pusher after uploading the byte to the media service).</item>
/// <item>Attaches one photo to a seeded fraction of posts
///   (<see cref="PlanActivity.MediaPostRatio"/>), emitting a
///   <c>posts.postmedia.create</c> child op per photo.</item>
/// </list>
/// </summary>
public sealed class SeedAuthor(
    IInferenceClient llm,
    GenerationParams pars,
    int concurrency,
    IMediaSource? media = null)
{
    private static readonly string[] Reactions = ["like", "love", "haha", "wow", "support"];

    public async Task<AuthoredRun> BuildAsync(
        ScenarioPlan plan, GenLedger ledger, IReadOnlyDictionary<string, string> resume,
        string? mediaDir, CancellationToken ct)
    {
        var rng = new Random(plan.RngSeed);
        var personas = plan.Personas.ToDictionary(p => p.Ref);
        var bios = new Dictionary<string, string>();
        var backstories = new Dictionary<string, string>();
        var avatarUrls = new Dictionary<string, string>(); // ref → @media: symbolic ref
        var operations = new List<SeedOperation>();
        var units = new List<GenUnit>();
        var slotOpIndex = new Dictionary<string, int>(StringComparer.Ordinal);

        var clock = 0;
        string Tick(int maxStep) => $"{clock += rng.Next(1, Math.Max(2, maxStep))}s";

        // ── Identity: backstory → bio (sequential so bio reflects backstory) ──
        // Each persona also gets a profile.edit op whose Data dict is closed-over
        // so the bio and avatar url are filled in before the pusher runs.
        foreach (var p in plan.Personas)
        {
            var bsSlot = $"backstory:{p.Ref}";
            var bioSlot = $"bio:{p.Ref}";
            slotOpIndex[bsSlot] = -1;
            slotOpIndex[bioSlot] = -1;

            // Avatar bytes are pure-local (SVG identicon) — generate synchronously now
            // so we can set avatarUrls[p.Ref] before the profile.edit op is created.
            if (media is not null && mediaDir is not null)
            {
                var avatar = await media.GetAvatarAsync(p.Handle, plan.RngSeed, ct);
                Directory.CreateDirectory(mediaDir);
                await File.WriteAllBytesAsync(Path.Combine(mediaDir, avatar.FileName), avatar.Bytes, ct);
                avatarUrls[p.Ref] = $"@media:{avatar.FileName}";
            }

            // profile.edit data dict — bio is filled by the bio-step closure below;
            // avatarUrl is already resolved to a @media: ref (or absent).
            var profileData = new Dictionary<string, object?>
            {
                ["displayName"] = p.DisplayName,
                ["handle"] = p.Handle,
            };
            if (avatarUrls.TryGetValue(p.Ref, out var avatarRef))
                profileData["avatarUrl"] = avatarRef;

            units.Add(new GenUnit
            {
                Id = $"identity:{p.Ref}",
                Steps =
                [
                    new GenStep(bsSlot, "backstory", PersonaSystem(p),
                        _ => "Write a 3-4 sentence first-person backstory: where you're from, how you "
                             + "got into your field, and what you care about. Warm and grounded, no quotes.",
                        t => backstories[p.Ref] = Clean(t, 800)) { MaxTokens = 700 },

                    new GenStep(bioSlot, "bio", PersonaSystem(p),
                        prior => $"Backstory:\n{First(prior)}\n\n"
                                 + "Write a short, natural social-media bio in the first person "
                                 + "(max ~140 characters). No quotes.",
                        t =>
                        {
                            bios[p.Ref] = Clean(t, 160);
                            profileData["bio"] = bios[p.Ref]; // wired into profile.edit Data
                        }),
                ],
            });

            // profile.edit op — bio is set by closure above when the unit runs;
            // the pusher resolves @media: refs after the media upload pre-step.
            slotOpIndex[$"profile:{p.Ref}"] = operations.Count;
            operations.Add(new SeedOperation
            {
                Kind = "profile.edit",
                As = p.Ref,
                AtOffset = Tick(30),
                Data = profileData,
            });
        }

        // ── Intra-circle friendships ─────────────────────────────────────────
        // A "circle" is a paradigm cluster (CONTENT.md PARADIGMS). Everyone in the
        // same paradigm is mutually friended, so the social graph carries real,
        // separable communities — Coding people friend Coding people, etc. Personas
        // with no paradigm fall into one shared "default" circle (back-compat).
        foreach (var circle in plan.Personas.GroupBy(Circle))
        {
            var members = circle.ToList();
            for (var a = 0; a < members.Count; a++)
            for (var b = a + 1; b < members.Count; b++)
            {
                operations.Add(new SeedOperation
                {
                    Kind = "socialgraph.friend.create",
                    As = members[a].Ref,
                    AtOffset = Tick(60),
                    Data = new Dictionary<string, object?>
                    {
                        ["requester"] = members[a].Ref,
                        ["recipient"] = members[b].Ref,
                        ["status"] = "accepted",
                    },
                });
            }
        }

        // ── Posts + their comments + reactions ───────────────────────────────
        var postSeq = 0;
        var commentSeq = 0;
        foreach (var author in plan.Personas)
        {
            var posts = RangePick(rng, plan.Activity.PostsPerPersona);
            for (var i = 0; i < posts; i++)
            {
                var postRef = $"@p{++postSeq}";
                var topic = Pick(rng, author.Interests, "everyday life");
                var withPhoto = media is not null && mediaDir is not null
                    && plan.Activity.MediaPostRatio > 0
                    && rng.NextDouble() < plan.Activity.MediaPostRatio;
                var postData = new Dictionary<string, object?>
                {
                    ["contentType"] = withPhoto ? "image" : "text",
                    ["visibility"] = "public",
                };
                slotOpIndex[$"post:{postRef}"] = operations.Count;
                operations.Add(new SeedOperation
                {
                    Ref = postRef,
                    Kind = "posts.post.create",
                    As = author.Ref,
                    AtOffset = Tick(900),
                    Data = postData,
                });

                // Photo child op — bytes fetched (and cached) synchronously here
                // because we need the filename to emit the op ref now.
                if (withPhoto)
                {
                    var photo = await media!.GetPhotoAsync(topic, plan.RngSeed + postSeq, ct);
                    Directory.CreateDirectory(mediaDir!);
                    await File.WriteAllBytesAsync(Path.Combine(mediaDir!, photo.FileName), photo.Bytes, ct);

                    slotOpIndex[$"postmedia:{postRef}"] = operations.Count;
                    operations.Add(new SeedOperation
                    {
                        Kind = "posts.postmedia.create",
                        As = author.Ref,
                        On = postRef,
                        AtOffset = Tick(5),
                        Data = new Dictionary<string, object?>
                        {
                            ["postId"] = postRef,         // pusher resolves to real id
                            ["fileUrl"] = $"@media:{photo.FileName}", // pusher resolves after upload
                            ["mediaType"] = "image",
                            ["position"] = 0,
                        },
                    });
                }

                var steps = new List<GenStep>
                {
                    new($"post:{postRef}", "post", PersonaSystem(author),
                        _ => $"Write a single social-media post about {topic}. 1-3 sentences, your "
                             + "natural voice, no hashtags unless they fit, no quotes.",
                        t => postData["body"] = Clean(t, 400)),
                };

                // Scoped to the author's own circle: a Biology post is answered by
                // Biology folk, never the Coding circle — keeps each thread topically
                // coherent (anti-hallucination, CONTENT.md CHALLENGE).
                var others = plan.Personas
                    .Where(x => x.Ref != author.Ref && Circle(x) == Circle(author))
                    .ToList();
                if (others.Count > 0)
                {
                    var comments = RangePick(rng, plan.Activity.CommentsPerPost);
                    for (var c = 0; c < comments; c++)
                    {
                        var commenter = others[rng.Next(others.Count)];
                        var commentData = new Dictionary<string, object?> { ["targetType"] = "Post", ["targetId"] = postRef };
                        var commentSlot = $"comment:@cm{++commentSeq}";
                        slotOpIndex[commentSlot] = operations.Count;
                        operations.Add(new SeedOperation
                        {
                            Ref = $"@cm{commentSeq}",
                            Kind = "engagement.comment.create",
                            As = commenter.Ref,
                            On = postRef,
                            AtOffset = Tick(600),
                            Data = commentData,
                        });

                        steps.Add(new GenStep(commentSlot, "comment", PersonaSystem(commenter),
                            prior => $"A friend posted:\n\"{First(prior)}\"\n{EarlierReplies(prior)}"
                                     + "Write a short, casual reply — one sentence, no quotes.",
                            t => commentData["body"] = Clean(t, 200)));
                    }

                    var reactions = RangePick(rng, plan.Activity.ReactionsPerPost);
                    foreach (var reactor in others.OrderBy(_ => rng.Next()).Take(reactions))
                    {
                        operations.Add(new SeedOperation
                        {
                            Kind = "engagement.reaction.add",
                            As = reactor.Ref,
                            On = postRef,
                            AtOffset = Tick(300),
                            Data = new Dictionary<string, object?>
                            {
                                ["targetType"] = "Post",
                                ["targetId"] = postRef,
                                ["reactionType"] = Reactions[rng.Next(Reactions.Length)],
                            },
                        });
                    }
                }

                units.Add(new GenUnit { Id = $"thread:{postRef}", Steps = steps });
            }
        }

        // ── 1:1 conversations ────────────────────────────────────────────────
        var chatSeq = 0;
        foreach (var conv in plan.Activity.Conversations ?? [])
        {
            if (conv.Between.Count != 2 || conv.Turns <= 0) continue;
            if (!personas.ContainsKey(conv.Between[0]) || !personas.ContainsKey(conv.Between[1])) continue;

            var chatRef = $"@chat{++chatSeq}";
            operations.Add(new SeedOperation
            {
                Ref = chatRef,
                Kind = "chat.chat.create",
                As = conv.Between[0],
                With = conv.Between,
                AtOffset = Tick(120),
                Data = new Dictionary<string, object?> { ["type"] = "direct" },
            });

            var steps = new List<GenStep>(conv.Turns);
            for (var t = 0; t < conv.Turns; t++)
            {
                var speaker = personas[conv.Between[t % 2]];
                var msgData = new Dictionary<string, object?> { ["contentType"] = "text" };
                var slot = $"msg:{chatRef}#{t}";
                slotOpIndex[slot] = operations.Count;
                operations.Add(new SeedOperation
                {
                    Kind = "chat.message.send",
                    As = speaker.Ref,
                    In = chatRef,
                    AtOffset = Tick(180),
                    Data = msgData,
                });

                var topic = conv.Topic;
                steps.Add(new GenStep(slot, "message", PersonaSystem(speaker),
                    prior => $"You are direct-messaging 1:1 about: {topic}.\n"
                             + $"Conversation so far:\n{(prior.Count == 0 ? "(you start the conversation)" : string.Join("\n", prior))}\n\n"
                             + "Write ONLY your next message — one or two sentences, casual, no quotes.",
                    t2 => msgData["content"] = Clean(t2, 300)));
            }

            units.Add(new GenUnit { Id = $"chat:{chatRef}", Steps = steps });
        }

        var traces = await new GenRunner(concurrency, maxRetries: 5).RunAsync(units, llm, pars, ledger, resume, ct);

        var actors = plan.Personas.Select(p => new SeedActor(
            p.Ref,
            p.Handle,
            p.DisplayName,
            new SeedCredential($"{p.Handle}@seed.local", "Seed!Passw0rd"),
            new ActorProfile(
                bios.GetValueOrDefault(p.Ref),
                p.Interests,
                backstories.GetValueOrDefault(p.Ref),
                p.Paradigm,
                avatarUrls.GetValueOrDefault(p.Ref)))).ToList();

        return new AuthoredRun(actors, operations, traces, slotOpIndex);
    }

    private static string PersonaSystem(PlanPersona p) =>
        $"You are {p.DisplayName} (@{p.Handle}), a {p.Archetype} on a social network. " +
        $"Interests: {string.Join(", ", p.Interests)}. Tone: {p.Tone}. " +
        "Stay upbeat and good-natured; never toxic, negative, or offensive. " +
        "Never touch politics, religion, or moral controversy. " +
        "Write authentic, human content. Never mention being an AI or a model. " +
        "Output only the requested text — no preamble, no quotation marks.";

    private static string First(IReadOnlyList<string> prior) => prior.Count > 0 ? Clean(prior[0], 800) : "";

    private static string EarlierReplies(IReadOnlyList<string> prior) =>
        prior.Count > 1 ? $"Earlier replies:\n{string.Join("\n", prior.Skip(1))}\n" : "";

    private static int RangePick(Random rng, int[] range)
    {
        if (range is null || range.Length == 0) return 0;
        var min = range[0];
        var max = range.Length > 1 ? range[1] : range[0];
        if (max < min) (min, max) = (max, min);
        return rng.Next(min, max + 1);
    }

    private static string Pick(Random rng, IReadOnlyList<string> list, string fallback) =>
        list.Count == 0 ? fallback : list[rng.Next(list.Count)];

    /// <summary>The persona's circle key — its paradigm, or one shared "default"
    /// circle when no paradigm is set (preserves the single-group behavior).</summary>
    private static string Circle(PlanPersona p) =>
        string.IsNullOrWhiteSpace(p.Paradigm) ? "default" : p.Paradigm;

    private static string Clean(string text, int max)
    {
        var t = text.Trim();
        if (t.Length >= 2 &&
            ((t[0] == '"' && t[^1] == '"') || (t[0] == '\'' && t[^1] == '\'')))
            t = t[1..^1].Trim();
        if (t.StartsWith("- ", StringComparison.Ordinal))
            t = t[2..].Trim();
        return t.Length > max ? t[..max].TrimEnd() : t;
    }
}
