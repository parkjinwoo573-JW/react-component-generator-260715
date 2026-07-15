import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useComponentGenerator } from './useComponentGenerator';
import { saveHistory, loadHistory, MAX_HISTORY_SIZE } from '../utils/componentHistory';
import type { GeneratedComponent } from '../types';

function makeComponent(overrides: Partial<GeneratedComponent> = {}): GeneratedComponent {
  return {
    id: 'id-1',
    prompt: '버튼 만들어줘',
    code: 'const Demo = () => <div />;',
    createdAt: new Date('2026-07-15T10:00:00.000Z'),
    ...overrides,
  };
}

function mockFetchOnce(code: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ code }),
    }),
  );
}

describe('useComponentGenerator - 히스토리 영속화', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('마운트 시 로컬스토리지에 저장된 히스토리를 불러온다', () => {
    const stored = [makeComponent({ id: 'stored-1' })];
    saveHistory(stored);

    const { result } = renderHook(() => useComponentGenerator());

    expect(result.current.components.map((c) => c.id)).toEqual(['stored-1']);
  });

  it('generate로 새 컴포넌트를 추가하면 로컬스토리지에도 저장된다', async () => {
    mockFetchOnce('const Demo = () => <div />;');
    const { result } = renderHook(() => useComponentGenerator());

    await act(async () => {
      await result.current.generate('버튼 만들어줘', undefined, 'google');
    });

    await waitFor(() => {
      expect(loadHistory()).toHaveLength(1);
    });
  });

  it('removeComponent로 삭제하면 로컬스토리지에서도 사라진다', () => {
    const stored = [makeComponent({ id: 'a' }), makeComponent({ id: 'b' })];
    saveHistory(stored);
    const { result } = renderHook(() => useComponentGenerator());

    act(() => {
      result.current.removeComponent('a');
    });

    expect(loadHistory().map((c) => c.id)).toEqual(['b']);
  });

  it('clearAll을 호출하면 로컬스토리지도 비워진다', () => {
    saveHistory([makeComponent()]);
    const { result } = renderHook(() => useComponentGenerator());

    act(() => {
      result.current.clearAll();
    });

    expect(loadHistory()).toEqual([]);
  });

  it('마운트 시점에는 방금 불러온 히스토리를 다시 저장하지 않는다', () => {
    saveHistory([makeComponent({ id: 'stored-1' })]);
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    setItemSpy.mockClear();

    renderHook(() => useComponentGenerator());

    expect(setItemSpy).not.toHaveBeenCalled();
    setItemSpy.mockRestore();
  });

  it('컴포넌트 개수가 MAX_HISTORY_SIZE를 넘으면 가장 오래된 항목이 화면과 저장소에서 사라진다', async () => {
    const existing = Array.from({ length: MAX_HISTORY_SIZE }, (_, i) =>
      makeComponent({ id: `old-${i}` }),
    );
    saveHistory(existing);
    mockFetchOnce('const Demo = () => <div />;');
    const { result } = renderHook(() => useComponentGenerator());

    await act(async () => {
      await result.current.generate('새 컴포넌트', undefined, 'google');
    });

    expect(result.current.components).toHaveLength(MAX_HISTORY_SIZE);
    expect(result.current.components.map((c) => c.id)).not.toContain('old-19');
    await waitFor(() => {
      expect(loadHistory()).toHaveLength(MAX_HISTORY_SIZE);
    });
  });
});
