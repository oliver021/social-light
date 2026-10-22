using SocialLight.Feed.API.Application;
using SocialLight.Feed.API.Dtos;
using SocialLight.Posts.Contracts;
using Xunit;

namespace Feed.UnitTests;

public class FeedComposerTests
{
    private static readonly DateTime Now = new(2026, 6, 17, 12, 0, 0, DateTimeKind.Utc);
    private static readonly Guid Alice = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid Bob = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid Stranger = Guid.Parse("33333333-3333-3333-3333-333333333333");

    private static PostDto Post(Guid id, Guid author, DateTime? publishedAt, string status = "published") =>
        new(id, author, "text", "public", status, "body", null, null, publishedAt, null);

    [Fact]
    public void Includes_only_posts_from_followed_authors_that_are_published()
    {
        var followed = Post(Guid.NewGuid(), Bob, Now.AddHours(-1));
        var draft = Post(Guid.NewGuid(), Bob, null, status: "draft");
        var stranger = Post(Guid.NewGuid(), Stranger, Now.AddHours(-1));

        var feed = FeedComposer.Compose(
            authorIds: new HashSet<Guid> { Alice, Bob },
            posts: [followed, draft, stranger],
            authors: new Dictionary<Guid, FeedAuthorDto>(),
            commentCounts: new Dictionary<Guid, int>(),
            reactionCounts: new Dictionary<Guid, int>(),
            now: Now,
            take: 50);

        Assert.Single(feed);
        Assert.Equal(followed.Id, feed[0].PostId);
    }

    [Fact]
    public void Ranks_more_recent_posts_higher_and_applies_engagement_boost()
    {
        var older = Post(Guid.NewGuid(), Bob, Now.AddHours(-10));
        var newer = Post(Guid.NewGuid(), Bob, Now.AddHours(-1));

        var feed = FeedComposer.Compose(
            new HashSet<Guid> { Bob },
            [older, newer],
            new Dictionary<Guid, FeedAuthorDto>(),
            commentCounts: new Dictionary<Guid, int> { [older.Id] = 0, [newer.Id] = 0 },
            reactionCounts: new Dictionary<Guid, int>(),
            Now,
            50);

        Assert.Equal(newer.Id, feed[0].PostId);   // recency dominates with equal engagement
        Assert.Equal(older.Id, feed[1].PostId);
    }

    [Fact]
    public void Attaches_author_and_counts()
    {
        var post = Post(Guid.NewGuid(), Bob, Now.AddHours(-1));

        var feed = FeedComposer.Compose(
            new HashSet<Guid> { Bob },
            [post],
            new Dictionary<Guid, FeedAuthorDto> { [Bob] = new(Bob, "Bob", "http://avatar") },
            new Dictionary<Guid, int> { [post.Id] = 3 },
            new Dictionary<Guid, int> { [post.Id] = 7 },
            Now,
            50);

        var item = Assert.Single(feed);
        Assert.Equal("Bob", item.Author!.DisplayName);
        Assert.Equal(3, item.CommentCount);
        Assert.Equal(7, item.ReactionCount);
    }

    private static IReadOnlyList<FeedItemDto> Run(IEnumerable<PostDto> posts, Dictionary<Guid, int>? comments = null,
        Dictionary<Guid, int>? reactions = null, int take = 50, params Guid[] authors) =>
        FeedComposer.Compose(new HashSet<Guid>(authors.Length == 0 ? [Bob] : authors), posts,
            new Dictionary<Guid, FeedAuthorDto>(), comments ?? [], reactions ?? [], Now, take);

    [Fact]
    public void Empty_follow_set_yields_an_empty_feed()
        => Assert.Empty(FeedComposer.Compose(new HashSet<Guid>(), [Post(Guid.NewGuid(), Bob, Now)],
            new Dictionary<Guid, FeedAuthorDto>(), new Dictionary<Guid, int>(), new Dictionary<Guid, int>(), Now, 50));

    [Fact]
    public void Take_caps_the_result_keeping_the_best_ranked()
    {
        var posts = Enumerable.Range(1, 5).Select(h => Post(Guid.NewGuid(), Bob, Now.AddHours(-h))).ToList();
        var feed = Run(posts, take: 2);
        Assert.Equal(2, feed.Count);
        Assert.Equal(posts[0].Id, feed[0].PostId);
        Assert.Equal(posts[1].Id, feed[1].PostId);
    }

    [Fact]
    public void Status_match_is_case_insensitive()
        => Assert.Single(Run([Post(Guid.NewGuid(), Bob, Now.AddHours(-1), status: "Published")]));

    [Fact]
    public void Missing_author_leaves_author_null_without_failing()
        => Assert.Null(Assert.Single(Run([Post(Guid.NewGuid(), Bob, Now.AddHours(-1))])).Author);

    [Fact]
    public void Heavy_engagement_can_outrank_a_fresher_post()
    {
        var old = Post(Guid.NewGuid(), Bob, Now.AddHours(-24));
        var fresh = Post(Guid.NewGuid(), Bob, Now.AddHours(-1));
        var feed = Run([fresh, old], comments: new() { [old.Id] = 20 });
        Assert.Equal(old.Id, feed[0].PostId);
    }

    [Fact]
    public void Undated_post_is_treated_as_48_hours_old()
    {
        var p = Post(Guid.NewGuid(), Bob, null);
        var item = Assert.Single(Run([p]));
        Assert.Equal(1.0 / 49.0, item.Score, 6);
    }

    [Fact]
    public void Composition_is_deterministic_for_identical_input()
    {
        var posts = Enumerable.Range(1, 8).Select(h => Post(Guid.NewGuid(), Bob, Now.AddHours(-h))).ToList();
        var a = Run(posts).Select(i => i.PostId).ToList();
        var b = Run(posts.AsEnumerable().Reverse()).Select(i => i.PostId).ToList();
        Assert.Equal(a, b);
    }

    [Fact]
    public void Reactions_weigh_less_than_comments()
    {
        var a = Post(Guid.NewGuid(), Bob, Now.AddHours(-2));
        var b = Post(Guid.NewGuid(), Bob, Now.AddHours(-2));
        var feed = Run([a, b], comments: new() { [a.Id] = 1 }, reactions: new() { [b.Id] = 1 });
        Assert.Equal(a.Id, feed[0].PostId);
    }
}
