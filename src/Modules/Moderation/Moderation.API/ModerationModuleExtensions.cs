namespace SocialLight.Moderation.API;

/// <summary>
/// The single line the host needs to adopt this module (DESIGN-STRATEGY.md §4):
/// it registers the module's PORTS (repositories), application services, and
/// schema initializer. It deliberately does NOT bind the database or the broker —
/// those are the host's job — so the module never sees a connection string.
/// </summary>
public static class ModerationModuleExtensions
{
    public static IServiceCollection AddModerationModule(this IServiceCollection services)
    {
        // Ports → adapters (dependency inversion; the adapter is swappable).
        services.AddScoped<IReportRepository, EfReportRepository>();
        services.AddScoped<IModerationCaseRepository, EfModerationCaseRepository>();
        services.AddScoped<IModerationActionRepository, EfModerationActionRepository>();
        services.AddScoped<IModerationNoteRepository, EfModerationNoteRepository>();
        services.AddScoped<IAppealRepository, EfAppealRepository>();

        // Application services.
        services.AddScoped<ReportService>();
        services.AddScoped<ModerationCaseService>();
        services.AddScoped<ModerationActionService>();
        services.AddScoped<ModerationNoteService>();
        services.AddScoped<AppealService>();

        // Schema initialization (EnsureCreated; per-module EF migrations are the
        // intended successor — DESIGN-STRATEGY.md §10).
        services.AddHostedService<ModerationDbInitializer>();

        return services;
    }
}
