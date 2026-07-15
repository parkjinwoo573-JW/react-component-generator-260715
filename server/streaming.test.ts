import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callAnthropicStream, callGoogleStream, eventStreamChunk } from './streaming';

describe('callAnthropicStream', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('스트림 응답을 받아서 청크 단위로 전송한다', async () => {
    const mockChunks = ['const ', 'Button', ' = ', '() => ', '(...)'];
    const reader = {
      read: vi.fn()
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"const "}}\n') })
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Button"}}\n') })
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"type":"content_block_delta","delta":{"type":"text_delta","text":" = "}}\n') })
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"() => "}}\n') })
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"(...)"}} \n') })
        .mockResolvedValueOnce({ done: true }),
      releaseLock: vi.fn(),
    };

    const mockStream = {
      getReader: vi.fn(() => reader),
    };

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      body: mockStream,
    } as any);

    const chunks: string[] = [];
    const stream = callAnthropicStream('test prompt', 'test-key');

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(mockChunks);
  });

  it('API 에러를 처리한다', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
    } as any);

    const stream = callAnthropicStream('test', 'invalid-key');
    await expect(async () => {
      for await (const _ of stream) {
        // iterate
      }
    }).rejects.toThrow('Claude API error: 401');
  });
});

describe('callGoogleStream', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('Google API 스트림 응답을 받아서 청크 단위로 전송한다', async () => {
    const mockChunks = ['const ', 'Card', ' = ', '() => '];
    const reader = {
      read: vi.fn()
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('{"candidates":[{"content":{"parts":[{"text":"const "}]}}]}\n') })
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('{"candidates":[{"content":{"parts":[{"text":"Card"}]}}]}\n') })
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('{"candidates":[{"content":{"parts":[{"text":" = "}]}}]}\n') })
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('{"candidates":[{"content":{"parts":[{"text":"() => "}]}}]}\n') })
        .mockResolvedValueOnce({ done: true }),
      releaseLock: vi.fn(),
    };

    const mockStream = {
      getReader: vi.fn(() => reader),
    };

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      body: mockStream,
    } as any);

    const chunks: string[] = [];
    const stream = callGoogleStream('test prompt', 'test-key');

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(mockChunks);
  });
});

describe('eventStreamChunk', () => {
  it('텍스트를 SSE 형식으로 인코딩한다', () => {
    const encoded = eventStreamChunk('const Button');
    expect(encoded).toBe('data: const Button\n\n');
  });

  it('종료 신호를 인코딩한다', () => {
    const encoded = eventStreamChunk('[DONE]');
    expect(encoded).toBe('data: [DONE]\n\n');
  });
});
