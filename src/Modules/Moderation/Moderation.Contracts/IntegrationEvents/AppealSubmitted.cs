using SocialLight.EventBus.Events;

namespace SocialLight.Moderation.Contracts.IntegrationEvents;

/// <summary>
/// Outbound integration event of the "Moderation" module (declared in
/// spec.publishes). Other modules react to this <b>only</b> via the event bus —
/// never by referencing this module directly (DESIGN-STRATEGY.md §3, §4).
/// </summary>
/// <remarks>
/// Canonical v1 emits the event as a typed marker. A typed payload (e.g. the
/// affected entity id) is a deliberate refinement — see the event-contract
/// versioning item in DESIGN-STRATEGY.md §10.
/// </remarks>
public record AppealSubmitted : IntegrationEvent;
