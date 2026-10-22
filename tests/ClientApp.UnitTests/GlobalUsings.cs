global using SocialLight.ClientApp.Services;
global using SocialLight.ClientApp.Services.AppEnvironment;
global using SocialLight.ClientApp.Services.Basket;
global using SocialLight.ClientApp.Services.Catalog;
global using SocialLight.ClientApp.Services.Order;
global using SocialLight.ClientApp.Services.Settings;
global using SocialLight.ClientApp.ViewModels;
global using Microsoft.VisualStudio.TestTools.UnitTesting;

[assembly: Parallelize(Workers = 0, Scope = ExecutionScope.MethodLevel)]
