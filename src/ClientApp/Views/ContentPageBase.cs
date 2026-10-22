using SocialLight.ClientApp.ViewModels.Base;

namespace SocialLight.ClientApp.Views;

public abstract class ContentPageBase : ContentPage
{
    public ContentPageBase()
    {
        NavigationPage.SetBackButtonTitle(this, string.Empty);
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();

        if (BindingContext is not IViewModelBase ivmb)
        {
            return;
        }

        await ivmb.InitializeAsyncCommand.ExecuteAsync(null);
    }
}
