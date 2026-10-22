using SocialLight.ClientApp.Models.Orders;
using SocialLight.ClientApp.Services;
using SocialLight.ClientApp.Services.AppEnvironment;
using SocialLight.ClientApp.Services.Settings;
using SocialLight.ClientApp.ViewModels.Base;

namespace SocialLight.ClientApp.ViewModels;

public partial class OrderDetailViewModel : ViewModelBase, IQueryAttributable
{
    private readonly IAppEnvironmentService _appEnvironmentService;
    private readonly ISettingsService _settingsService;

    [ObservableProperty] private bool _isSubmittedOrder;

    [ObservableProperty] private Order _order;

    [ObservableProperty] private int _orderNumber;

    [ObservableProperty] private string _orderStatusText;

    public OrderDetailViewModel(
        IAppEnvironmentService appEnvironmentService,
        INavigationService navigationService, ISettingsService settingsService)
        : base(navigationService)
    {
        _appEnvironmentService = appEnvironmentService;
        _settingsService = settingsService;
    }

    public override async Task InitializeAsync()
    {
        await IsBusyFor(
            async () =>
            {
                // Get order detail info
                Order = await _appEnvironmentService.OrderService.GetOrderAsync(OrderNumber);
                IsSubmittedOrder = Order.OrderStatus.Equals("Submitted", StringComparison.OrdinalIgnoreCase);
                OrderStatusText = Order.OrderStatus;
            });
    }

    [RelayCommand]
    private async Task ToggleCancelOrderAsync()
    {
        var result = await _appEnvironmentService.OrderService.CancelOrderAsync(Order.OrderNumber);

        if (result)
        {
            OrderStatusText = "Cancelled";
        }
        else
        {
            Order = await _appEnvironmentService.OrderService.GetOrderAsync(Order.OrderNumber);
            OrderStatusText = Order.OrderStatus;
        }

        IsSubmittedOrder = false;
    }

    public override void ApplyQueryAttributes(IDictionary<string, object> query)
    {
        if (query.TryGetValue("OrderNumber", out var orderNumber))
        {
            if (orderNumber is string orderNumberString && int.TryParse(orderNumberString, out var parsedOrderNumber))
            {
                OrderNumber = parsedOrderNumber;
            }
            else if (orderNumber is int intOrderNumber)
            {
                OrderNumber = intOrderNumber;
            }
        }
    }
}
