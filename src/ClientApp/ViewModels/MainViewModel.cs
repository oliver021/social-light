using SocialLight.ClientApp.Services;
using SocialLight.ClientApp.ViewModels.Base;

namespace SocialLight.ClientApp.ViewModels;

public partial class MainViewModel : ViewModelBase
{
    public MainViewModel(INavigationService navigationService)
        : base(navigationService)
    {
    }

    [RelayCommand]
    private async Task SettingsAsync()
    {
        await NavigationService.NavigateToAsync("Settings");
    }
}
