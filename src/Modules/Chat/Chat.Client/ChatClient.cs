using System.Net.Http.Json;
using SocialLight.Chat.Contracts;

namespace SocialLight.Chat.Client;

/// <summary>
/// Typed client for the "Chat" module API (DESIGN-STRATEGY.md §5). A
/// generated CRUD page and a hand-built page (feed, profile, ...) both consume
/// this; neither knows whether the other exists. The seam between generated and
/// manual code rides on this contract — it does not break decoupling, it relies
/// on it (§6).
/// </summary>
public class ChatClient(HttpClient httpClient)
{
    /// <summary>Lists all <c>Chat</c> items.</summary>
    public async Task<IReadOnlyList<ChatDto>> GetChatsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<ChatDto>>(
            "/api/chats?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>Chat</c> by id, or <c>null</c> if absent.</summary>
    public async Task<ChatDto?> GetChatAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<ChatDto>(
            $"/api/chats/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>Chat</c> and returns the created resource.</summary>
    public async Task<ChatDto?> CreateChatAsync(CreateChatRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/chats?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ChatDto>(cancellationToken);
    }

    /// <summary>Lists all <c>ChatParticipant</c> items.</summary>
    public async Task<IReadOnlyList<ChatParticipantDto>> GetChatParticipantsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<ChatParticipantDto>>(
            "/api/chat-participants?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>ChatParticipant</c> by id, or <c>null</c> if absent.</summary>
    public async Task<ChatParticipantDto?> GetChatParticipantAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<ChatParticipantDto>(
            $"/api/chat-participants/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>ChatParticipant</c> and returns the created resource.</summary>
    public async Task<ChatParticipantDto?> CreateChatParticipantAsync(CreateChatParticipantRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/chat-participants?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ChatParticipantDto>(cancellationToken);
    }

    /// <summary>Lists all <c>Message</c> items.</summary>
    public async Task<IReadOnlyList<MessageDto>> GetMessagesAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<MessageDto>>(
            "/api/messages?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>Message</c> by id, or <c>null</c> if absent.</summary>
    public async Task<MessageDto?> GetMessageAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<MessageDto>(
            $"/api/messages/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>Message</c> and returns the created resource.</summary>
    public async Task<MessageDto?> CreateMessageAsync(CreateMessageRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/messages?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<MessageDto>(cancellationToken);
    }

    /// <summary>Lists all <c>MessageReaction</c> items.</summary>
    public async Task<IReadOnlyList<MessageReactionDto>> GetMessageReactionsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<MessageReactionDto>>(
            "/api/message-reactions?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>MessageReaction</c> by id, or <c>null</c> if absent.</summary>
    public async Task<MessageReactionDto?> GetMessageReactionAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<MessageReactionDto>(
            $"/api/message-reactions/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>MessageReaction</c> and returns the created resource.</summary>
    public async Task<MessageReactionDto?> CreateMessageReactionAsync(CreateMessageReactionRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/message-reactions?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<MessageReactionDto>(cancellationToken);
    }

    /// <summary>Lists all <c>MessageReadReceipt</c> items.</summary>
    public async Task<IReadOnlyList<MessageReadReceiptDto>> GetMessageReadReceiptsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<MessageReadReceiptDto>>(
            "/api/message-read-receipts?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>MessageReadReceipt</c> by id, or <c>null</c> if absent.</summary>
    public async Task<MessageReadReceiptDto?> GetMessageReadReceiptAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<MessageReadReceiptDto>(
            $"/api/message-read-receipts/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>MessageReadReceipt</c> and returns the created resource.</summary>
    public async Task<MessageReadReceiptDto?> CreateMessageReadReceiptAsync(CreateMessageReadReceiptRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/message-read-receipts?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<MessageReadReceiptDto>(cancellationToken);
    }

    /// <summary>Lists all <c>MessageAttachment</c> items.</summary>
    public async Task<IReadOnlyList<MessageAttachmentDto>> GetMessageAttachmentsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<MessageAttachmentDto>>(
            "/api/message-attachments?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>MessageAttachment</c> by id, or <c>null</c> if absent.</summary>
    public async Task<MessageAttachmentDto?> GetMessageAttachmentAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<MessageAttachmentDto>(
            $"/api/message-attachments/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>MessageAttachment</c> and returns the created resource.</summary>
    public async Task<MessageAttachmentDto?> CreateMessageAttachmentAsync(CreateMessageAttachmentRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/message-attachments?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<MessageAttachmentDto>(cancellationToken);
    }

    /// <summary>Lists all <c>ChatBlock</c> items.</summary>
    public async Task<IReadOnlyList<ChatBlockDto>> GetChatBlocksAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<ChatBlockDto>>(
            "/api/chat-blocks?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>ChatBlock</c> by id, or <c>null</c> if absent.</summary>
    public async Task<ChatBlockDto?> GetChatBlockAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<ChatBlockDto>(
            $"/api/chat-blocks/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>ChatBlock</c> and returns the created resource.</summary>
    public async Task<ChatBlockDto?> CreateChatBlockAsync(CreateChatBlockRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/chat-blocks?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ChatBlockDto>(cancellationToken);
    }

    /// <summary>Lists all <c>ChatRequest</c> items.</summary>
    public async Task<IReadOnlyList<ChatRequestDto>> GetChatRequestsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<ChatRequestDto>>(
            "/api/chat-requests?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>ChatRequest</c> by id, or <c>null</c> if absent.</summary>
    public async Task<ChatRequestDto?> GetChatRequestAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<ChatRequestDto>(
            $"/api/chat-requests/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>ChatRequest</c> and returns the created resource.</summary>
    public async Task<ChatRequestDto?> CreateChatRequestAsync(CreateChatRequestRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/chat-requests?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ChatRequestDto>(cancellationToken);
    }

    /// <summary>Lists all <c>ChatMute</c> items.</summary>
    public async Task<IReadOnlyList<ChatMuteDto>> GetChatMutesAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<ChatMuteDto>>(
            "/api/chat-mutes?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>ChatMute</c> by id, or <c>null</c> if absent.</summary>
    public async Task<ChatMuteDto?> GetChatMuteAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<ChatMuteDto>(
            $"/api/chat-mutes/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>ChatMute</c> and returns the created resource.</summary>
    public async Task<ChatMuteDto?> CreateChatMuteAsync(CreateChatMuteRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/chat-mutes?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ChatMuteDto>(cancellationToken);
    }

    /// <summary>Lists all <c>ChatPin</c> items.</summary>
    public async Task<IReadOnlyList<ChatPinDto>> GetChatPinsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<ChatPinDto>>(
            "/api/chat-pins?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>ChatPin</c> by id, or <c>null</c> if absent.</summary>
    public async Task<ChatPinDto?> GetChatPinAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<ChatPinDto>(
            $"/api/chat-pins/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>ChatPin</c> and returns the created resource.</summary>
    public async Task<ChatPinDto?> CreateChatPinAsync(CreateChatPinRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/chat-pins?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ChatPinDto>(cancellationToken);
    }

}
