using MediatR;

namespace socialLight.Social.API.Application.Commands;

public record CreateFriendshipCommand(
    Guid RequesterId,
    Guid AddresseeId,
    string Status,
    DateTime CreatedAt
) : IRequest<bool>;
