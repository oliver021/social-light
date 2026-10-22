namespace SocialLight.Ordering.API.Application.Commands;
using SocialLight.Ordering.API.Application.Models;

public record CreateOrderDraftCommand(string BuyerId, IEnumerable<BasketItem> Items) : IRequest<OrderDraftDTO>;
