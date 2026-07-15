import { describe, it, expect, beforeEach } from 'vitest';
import type { GeneratedComponent } from '../types';
import {
  HISTORY_STORAGE_KEY,
  MAX_HISTORY_SIZE,
  capHistory,
  parseStoredComponents,
  loadHistory,
  saveHistory,
} from './componentHistory';

function makeComponent(overrides: Partial<GeneratedComponent> = {}): GeneratedComponent {
  return {
    id: 'id-1',
    prompt: '버튼 만들어줘',
    code: 'const Demo = () => <div />;',
    createdAt: new Date('2026-07-15T10:00:00.000Z'),
    ...overrides,
  };
}

describe('capHistory', () => {
  it('배열 길이가 max 이하이면 그대로 반환한다', () => {
    const components = [makeComponent({ id: '1' }), makeComponent({ id: '2' })];

    expect(capHistory(components, 5)).toEqual(components);
  });

  it('배열 길이가 max를 초과하면 앞에서부터 max개만 남긴다', () => {
    const components = [
      makeComponent({ id: '1' }),
      makeComponent({ id: '2' }),
      makeComponent({ id: '3' }),
    ];

    const result = capHistory(components, 2);

    expect(result.map((c) => c.id)).toEqual(['1', '2']);
  });
});

describe('parseStoredComponents', () => {
  it('null이면 빈 배열을 반환한다', () => {
    expect(parseStoredComponents(null)).toEqual([]);
  });

  it('잘못된 JSON 문자열이면 빈 배열을 반환한다', () => {
    expect(parseStoredComponents('{ this is not json')).toEqual([]);
  });

  it('JSON이 배열이 아니면 빈 배열을 반환한다', () => {
    expect(parseStoredComponents(JSON.stringify({ foo: 'bar' }))).toEqual([]);
  });

  it('유효한 JSON 배열이면 createdAt을 Date로 복원한다', () => {
    const raw = JSON.stringify([
      { id: '1', prompt: 'p', code: 'c', createdAt: '2026-07-15T10:00:00.000Z' },
    ]);

    const result = parseStoredComponents(raw);

    expect(result).toHaveLength(1);
    expect(result[0].createdAt).toBeInstanceOf(Date);
    expect(result[0].createdAt.toISOString()).toBe('2026-07-15T10:00:00.000Z');
  });

  it('일부 항목의 형식이 잘못되면 그 항목만 제외하고 반환한다', () => {
    const raw = JSON.stringify([
      { id: '1', prompt: 'p', code: 'c', createdAt: '2026-07-15T10:00:00.000Z' },
      { id: '2', prompt: 'p', code: 'c', createdAt: 'not-a-date' },
      { id: 3, prompt: 'p', code: 'c', createdAt: '2026-07-15T10:00:00.000Z' },
      { prompt: 'p', code: 'c', createdAt: '2026-07-15T10:00:00.000Z' },
    ]);

    const result = parseStoredComponents(raw);

    expect(result.map((c) => c.id)).toEqual(['1']);
  });
});

describe('loadHistory / saveHistory', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('저장된 값이 없으면 빈 배열을 반환한다', () => {
    expect(loadHistory()).toEqual([]);
  });

  it('saveHistory로 저장한 내용을 loadHistory로 다시 불러올 수 있다', () => {
    const components = [makeComponent({ id: '1' }), makeComponent({ id: '2' })];

    saveHistory(components);
    const result = loadHistory();

    expect(result.map((c) => c.id)).toEqual(['1', '2']);
    expect(result[0].createdAt).toBeInstanceOf(Date);
  });

  it('saveHistory는 MAX_HISTORY_SIZE를 초과하는 항목을 잘라서 저장한다', () => {
    const components = Array.from({ length: MAX_HISTORY_SIZE + 5 }, (_, i) =>
      makeComponent({ id: String(i) }),
    );

    saveHistory(components);
    const result = loadHistory();

    expect(result).toHaveLength(MAX_HISTORY_SIZE);
    expect(result.map((c) => c.id)).toEqual(
      Array.from({ length: MAX_HISTORY_SIZE }, (_, i) => String(i)),
    );
  });

  it('저장 키는 HISTORY_STORAGE_KEY를 사용한다', () => {
    saveHistory([makeComponent()]);

    expect(localStorage.getItem(HISTORY_STORAGE_KEY)).not.toBeNull();
  });
});
