namespace SocialLight.ClientApp.Views;

public partial class BasketView
{
    public BasketView(BasketViewModel viewModel)
    {
        BindingContext = viewModel;
        InitializeComponent();
    }
}
