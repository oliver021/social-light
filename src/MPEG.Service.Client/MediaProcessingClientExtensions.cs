using System;
using Microsoft.Extensions.DependencyInjection;
using Grpc.Net.ClientFactory;
using SocialLight.MPEG.Service.Grpc;

namespace SocialLight.MPEG.Service.Client;

public static class MediaProcessingClientExtensions
{
    public static IServiceCollection AddMediaProcessingClient(this IServiceCollection services, Action<GrpcClientFactoryOptions> configureClient)
    {
        services.AddGrpcClient<MediaProcessing.MediaProcessingClient>(configureClient);
        services.AddTransient<IMediaProcessingClient, MediaProcessingClient>();
        return services;
    }
}
