namespace SocialLight.ClientApp.Views;

public partial class CheckoutView
{
    public CheckoutView(CheckoutViewModel viewModel)
    {
        BindingContext = viewModel;
        InitializeComponent();
    }
}
