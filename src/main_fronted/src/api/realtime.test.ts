import { describe, it, expect, vi, beforeEach } from 'vitest';

// A stand-in for the SignalR hub: records every invoke so the test can check the hub contract.
const hub = vi.hoisted(() => ({
  invoke: vi.fn(async () => undefined),
  on: vi.fn(),
  start: vi.fn(async () => undefined),
  state: 'Connected',
}));

vi.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: class {
    withUrl() { return this; }
    withAutomaticReconnect() { return this; }
    configureLogging() { return this; }
    build() { return hub; }
  },
  HubConnectionState: { Connected: 'Connected' },
  LogLevel: { Warning: 3 },
}));

import { sendChatMessage } from './realtime';

describe('sendChatMessage', () => {
  beforeEach(() => {
    hub.invoke.mockClear();
  });

  it('sends a text message with the text content type by default', async () => {
    await sendChatMessage('chat-1', 'hello');
    expect(hub.invoke).toHaveBeenCalledWith('Send', 'chat-1', 'text', 'hello', null);
  });

  it('sends an image as an image message whose content is the file url', async () => {
    await sendChatMessage('chat-1', '/blobs/photo.png', 'image');
    expect(hub.invoke).toHaveBeenCalledWith('Send', 'chat-1', 'image', '/blobs/photo.png', null);
  });

  it('rejects when the hub refuses the message, so the caller keeps the text', async () => {
    hub.invoke.mockRejectedValueOnce(new Error('hub refused'));
    await expect(sendChatMessage('chat-1', 'hello')).rejects.toThrow('hub refused');
  });
});
