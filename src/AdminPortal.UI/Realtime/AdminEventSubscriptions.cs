namespace SocialLight.AdminPortal.UI.Realtime;

/// <summary>
/// Aggregate (fan-in) wiring of realtime: the broker subscription set is generated
/// from EVERY module's <c>publishes</c> contract, so each published integration
/// event is relayed to admins via <see cref="AdminEventRelay{T}"/> → the SignalR
/// hub. Adding a module spec that publishes events adds a subscription here on
/// regen — no hand-editing (DESIGN-STRATEGY.md §4).
/// </summary>
public static class AdminEventSubscriptions
{
    public static IHostApplicationBuilder AddAdminEventRelay(this IHostApplicationBuilder builder)
    {
        builder.AddRabbitMqEventBus("eventbus")
            .AddSubscription<SocialLight.Chat.Contracts.IntegrationEvents.ChatCreated, AdminEventRelay<SocialLight.Chat.Contracts.IntegrationEvents.ChatCreated>>()
            .AddSubscription<SocialLight.Chat.Contracts.IntegrationEvents.MessageSent, AdminEventRelay<SocialLight.Chat.Contracts.IntegrationEvents.MessageSent>>()
            .AddSubscription<SocialLight.Chat.Contracts.IntegrationEvents.MessageEdited, AdminEventRelay<SocialLight.Chat.Contracts.IntegrationEvents.MessageEdited>>()
            .AddSubscription<SocialLight.Engagement.Contracts.IntegrationEvents.ReactionAdded, AdminEventRelay<SocialLight.Engagement.Contracts.IntegrationEvents.ReactionAdded>>()
            .AddSubscription<SocialLight.Engagement.Contracts.IntegrationEvents.ReactionRemoved, AdminEventRelay<SocialLight.Engagement.Contracts.IntegrationEvents.ReactionRemoved>>()
            .AddSubscription<SocialLight.Engagement.Contracts.IntegrationEvents.CommentAdded, AdminEventRelay<SocialLight.Engagement.Contracts.IntegrationEvents.CommentAdded>>()
            .AddSubscription<SocialLight.Engagement.Contracts.IntegrationEvents.ContentShared, AdminEventRelay<SocialLight.Engagement.Contracts.IntegrationEvents.ContentShared>>()
            .AddSubscription<SocialLight.Events.Contracts.IntegrationEvents.EventCreated, AdminEventRelay<SocialLight.Events.Contracts.IntegrationEvents.EventCreated>>()
            .AddSubscription<SocialLight.Events.Contracts.IntegrationEvents.EventAttendanceChanged, AdminEventRelay<SocialLight.Events.Contracts.IntegrationEvents.EventAttendanceChanged>>()
            .AddSubscription<SocialLight.Gaming.Contracts.IntegrationEvents.TournamentCreated, AdminEventRelay<SocialLight.Gaming.Contracts.IntegrationEvents.TournamentCreated>>()
            .AddSubscription<SocialLight.Gaming.Contracts.IntegrationEvents.MatchCompleted, AdminEventRelay<SocialLight.Gaming.Contracts.IntegrationEvents.MatchCompleted>>()
            .AddSubscription<SocialLight.Gaming.Contracts.IntegrationEvents.AchievementUnlocked, AdminEventRelay<SocialLight.Gaming.Contracts.IntegrationEvents.AchievementUnlocked>>()
            .AddSubscription<SocialLight.Groups.Contracts.IntegrationEvents.GroupCreated, AdminEventRelay<SocialLight.Groups.Contracts.IntegrationEvents.GroupCreated>>()
            .AddSubscription<SocialLight.Groups.Contracts.IntegrationEvents.GroupMemberJoined, AdminEventRelay<SocialLight.Groups.Contracts.IntegrationEvents.GroupMemberJoined>>()
            .AddSubscription<SocialLight.Groups.Contracts.IntegrationEvents.GroupMemberLeft, AdminEventRelay<SocialLight.Groups.Contracts.IntegrationEvents.GroupMemberLeft>>()
            .AddSubscription<SocialLight.Jobs.Contracts.IntegrationEvents.JobPositionPublished, AdminEventRelay<SocialLight.Jobs.Contracts.IntegrationEvents.JobPositionPublished>>()
            .AddSubscription<SocialLight.Jobs.Contracts.IntegrationEvents.JobApplicationSubmitted, AdminEventRelay<SocialLight.Jobs.Contracts.IntegrationEvents.JobApplicationSubmitted>>()
            .AddSubscription<SocialLight.Jobs.Contracts.IntegrationEvents.JobApplicationStatusChanged, AdminEventRelay<SocialLight.Jobs.Contracts.IntegrationEvents.JobApplicationStatusChanged>>()
            .AddSubscription<SocialLight.Moderation.Contracts.IntegrationEvents.ContentReported, AdminEventRelay<SocialLight.Moderation.Contracts.IntegrationEvents.ContentReported>>()
            .AddSubscription<SocialLight.Moderation.Contracts.IntegrationEvents.ModerationCaseOpened, AdminEventRelay<SocialLight.Moderation.Contracts.IntegrationEvents.ModerationCaseOpened>>()
            .AddSubscription<SocialLight.Moderation.Contracts.IntegrationEvents.ModerationActionTaken, AdminEventRelay<SocialLight.Moderation.Contracts.IntegrationEvents.ModerationActionTaken>>()
            .AddSubscription<SocialLight.Moderation.Contracts.IntegrationEvents.AppealSubmitted, AdminEventRelay<SocialLight.Moderation.Contracts.IntegrationEvents.AppealSubmitted>>()
            .AddSubscription<SocialLight.Organizations.Contracts.IntegrationEvents.OrganizationCreated, AdminEventRelay<SocialLight.Organizations.Contracts.IntegrationEvents.OrganizationCreated>>()
            .AddSubscription<SocialLight.Organizations.Contracts.IntegrationEvents.OrganizationMemberAdded, AdminEventRelay<SocialLight.Organizations.Contracts.IntegrationEvents.OrganizationMemberAdded>>()
            .AddSubscription<SocialLight.Organizations.Contracts.IntegrationEvents.OrganizationMemberRemoved, AdminEventRelay<SocialLight.Organizations.Contracts.IntegrationEvents.OrganizationMemberRemoved>>()
            .AddSubscription<SocialLight.Pages.Contracts.IntegrationEvents.PageCreated, AdminEventRelay<SocialLight.Pages.Contracts.IntegrationEvents.PageCreated>>()
            .AddSubscription<SocialLight.Pages.Contracts.IntegrationEvents.PageRoleAssigned, AdminEventRelay<SocialLight.Pages.Contracts.IntegrationEvents.PageRoleAssigned>>()
            .AddSubscription<SocialLight.Posts.Contracts.IntegrationEvents.PostPublished, AdminEventRelay<SocialLight.Posts.Contracts.IntegrationEvents.PostPublished>>()
            .AddSubscription<SocialLight.Posts.Contracts.IntegrationEvents.PostArchived, AdminEventRelay<SocialLight.Posts.Contracts.IntegrationEvents.PostArchived>>()
            .AddSubscription<SocialLight.Posts.Contracts.IntegrationEvents.PostRemoved, AdminEventRelay<SocialLight.Posts.Contracts.IntegrationEvents.PostRemoved>>()
            .AddSubscription<SocialLight.Reels.Contracts.IntegrationEvents.ReelCreated, AdminEventRelay<SocialLight.Reels.Contracts.IntegrationEvents.ReelCreated>>()
            .AddSubscription<SocialLight.SocialGraph.Contracts.IntegrationEvents.UserFollowed, AdminEventRelay<SocialLight.SocialGraph.Contracts.IntegrationEvents.UserFollowed>>()
            .AddSubscription<SocialLight.SocialGraph.Contracts.IntegrationEvents.UserUnfollowed, AdminEventRelay<SocialLight.SocialGraph.Contracts.IntegrationEvents.UserUnfollowed>>()
            .AddSubscription<SocialLight.SocialGraph.Contracts.IntegrationEvents.FriendRequested, AdminEventRelay<SocialLight.SocialGraph.Contracts.IntegrationEvents.FriendRequested>>()
            .AddSubscription<SocialLight.SocialGraph.Contracts.IntegrationEvents.FriendAccepted, AdminEventRelay<SocialLight.SocialGraph.Contracts.IntegrationEvents.FriendAccepted>>()
            .AddSubscription<SocialLight.SocialGraph.Contracts.IntegrationEvents.UserBlocked, AdminEventRelay<SocialLight.SocialGraph.Contracts.IntegrationEvents.UserBlocked>>()
            .AddSubscription<SocialLight.Stories.Contracts.IntegrationEvents.StoryCreated, AdminEventRelay<SocialLight.Stories.Contracts.IntegrationEvents.StoryCreated>>()
            .AddSubscription<SocialLight.Stories.Contracts.IntegrationEvents.StoryExpired, AdminEventRelay<SocialLight.Stories.Contracts.IntegrationEvents.StoryExpired>>()
            .AddSubscription<SocialLight.Threads.Contracts.IntegrationEvents.ThreadCreated, AdminEventRelay<SocialLight.Threads.Contracts.IntegrationEvents.ThreadCreated>>()
            .AddSubscription<SocialLight.Threads.Contracts.IntegrationEvents.ThreadReplyAdded, AdminEventRelay<SocialLight.Threads.Contracts.IntegrationEvents.ThreadReplyAdded>>()
            ;

        return builder;
    }
}
