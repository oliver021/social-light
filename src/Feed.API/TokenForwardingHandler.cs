using System.Net.Http.Headers;
using Microsoft.AspNetCore.Http;

namespace SocialLight.Feed.API;

/// <summary>
/// Forwards the caller's bearer token to downstream module APIs (which all
/// RequireAuthorization). Feed itself holds no credentials — it acts on behalf of
/// the authenticated user by relaying their JWT on each composed call.
/// </summary>
public sealed class TokenForwardingHandler(IHttpContextAccessor httpContextAccessor) : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var header = httpContextAccessor.HttpContext?.Request.Headers.Authorization.ToString();
        if (!string.IsNullOrEmpty(header) && AuthenticationHeaderValue.TryParse(header, out var parsed))
        {
            request.Headers.Authorization = parsed;
        }

        return await base.SendAsync(request, cancellationToken);
    }
}
