using System.Net.Http.Json;
using SocialLight.ContentEngine.Infrastructure;

namespace SocialLight.ContentEngine.Inference;

/// <summary>Sampling parameters for a single completion.</summary>
public sealed record GenerationParams(double Temperature = 0.85, int MaxTokens = 256);

/// <summary>
/// Port over a chat-completion model. The seed author depends only on this, so
/// the transport (llama.cpp today, Ollama/anything tomorrow) is swappable.
/// </summary>
public interface IInferenceClient
{
    Task<string> CompleteAsync(string system, string user, GenerationParams pars, CancellationToken ct);
}

/// <summary>
/// Talks to a local <c>llama.cpp</c> server over its OpenAI-compatible
/// <c>POST /v1/chat/completions</c> endpoint. Gemma-class models at a few
/// hundred tok/s are plenty to populate a dev social graph.
/// </summary>
public sealed class LlamaCppClient(HttpClient http, string model) : IInferenceClient
{
    public async Task<string> CompleteAsync(string system, string user, GenerationParams pars, CancellationToken ct)
    {
        var request = new
        {
            model,
            messages = new[]
            {
                new { role = "system", content = system },
                new { role = "user", content = user },
            },
            temperature = pars.Temperature,
            max_tokens = pars.MaxTokens,
            stream = false,
        };

        using var resp = await http.PostAsJsonAsync("/v1/chat/completions", request, Json.Options, ct);
        resp.EnsureSuccessStatusCode();

        var body = await resp.Content.ReadFromJsonAsync<ChatResponse>(Json.Options, ct)
                   ?? throw new InvalidOperationException("inference returned an empty body");

        return body.Choices.Count > 0 ? body.Choices[0].Message?.Content ?? string.Empty : string.Empty;
    }

    private sealed record ChatResponse(IReadOnlyList<Choice> Choices);
    private sealed record Choice(ChatMessage? Message);
    private sealed record ChatMessage(string? Content);
}
