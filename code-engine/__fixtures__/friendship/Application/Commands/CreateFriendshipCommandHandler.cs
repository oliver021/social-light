using MediatR;
using socialLight.Social.Domain.AggregatesModel.FriendshipAggregate;

namespace socialLight.Social.API.Application.Commands;

public class CreateFriendshipCommandHandler(IFriendshipRepository repository)
    : IRequestHandler<CreateFriendshipCommand, bool>
{
    public async Task<bool> Handle(CreateFriendshipCommand request, CancellationToken cancellationToken)
    {
        var friendship = new Friendship(
            request.RequesterId,
            request.AddresseeId,
            request.Status,
            request.CreatedAt
        );

        repository.Add(friendship);
        return await repository.UnitOfWork.SaveEntitiesAsync(cancellationToken);
    }
}
