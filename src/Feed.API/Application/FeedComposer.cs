using SocialLight.Posts.Contracts;

namespace SocialLight.Feed.API.Application;

/// <summary>
/// Pure ranking/composition of a feed from already-fetched data — no I/O, so it's
/// unit-testable in isolation. This is the part that would stay identical when the
/// feed flips from fan-out-on-read to a materialized read-model: only the data
/// source changes, not the ranking. Score = recency-dominant with a light
/// engagement boost (a deliberately simple v1; richer ranking is the
/// recommendation module's job later).
/// </summary>
public static class FeedComposer
{
    public static IReadOnlyList<FeedItemDto> Compose(
        IReadOnlySet<Guid> authorIds,
        IEnumerable<PostDto> posts,
        IReadOnlyDictionary<Guid, FeedAuthorDto> authors,
        IReadOnlyDictionary<Guid, int> commentCounts,
        IReadOnlyDictionary<Guid, int> reactionCounts,
        DateTime now,
        int take)
    {
        return posts
            .Where(p => authorIds.Contains(p.AuthorId)
                && string.Equals(p.Status, "published", StringComparison.OrdinalIgnoreCase))
            .Select(p =>
            {
                var comments = commentCounts.GetValueOrDefault(p.Id);
                var reactions = reactionCounts.GetValueOrDefault(p.Id);
                authors.TryGetValue(p.AuthorId, out var author);
                return new FeedItemDto(
                    p.Id, p.AuthorId, p.Body, p.ContentType, p.Visibility, p.PublishedAt,
                    author, comments, reactions,
                    Score(p.PublishedAt, comments, reactions, now));
            })
            .OrderByDescending(i => i.Score)
            .ThenByDescending(i => i.PublishedAt ?? DateTime.MinValue)
            .Take(take)
            .ToList();
    }

    private static double Score(DateTime? publishedAt, int comments, int reactions, DateTime now)
    {
        var hoursOld = publishedAt is null ? 48.0 : Math.Max(0, (now - publishedAt.Value).TotalHours);
        var recency = 1.0 / (1.0 + hoursOld);          // 1.0 fresh → 0 as it ages
        var engagement = (0.10 * comments) + (0.05 * reactions);
        return recency + engagement;
    }
}
