using CommunityToolkit.Mvvm.Messaging.Messages;

namespace SocialLight.ClientApp.Messages;

public class ProductCountChangedMessage(int count) : ValueChangedMessage<int>(count);
