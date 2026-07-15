import type { GeneratedComponent } from '../types';

export const HISTORY_STORAGE_KEY = 'react-component-generator:history';
export const MAX_HISTORY_SIZE = 20;

/**
 * components는 항상 "최신이 배열 앞쪽"이라고 가정하고 앞에서부터 max개만 남긴다.
 * 오름차순(오래된 것이 앞)으로 정렬된 배열에 쓰면 최신이 아니라 가장 오래된 항목이 남으므로 주의한다.
 */
export function capHistory(
  components: GeneratedComponent[],
  max: number,
): GeneratedComponent[] {
  return components.slice(0, max);
}

function toGeneratedComponent(item: unknown): GeneratedComponent | null {
  if (typeof item !== 'object' || item === null) return null;

  const { id, prompt, code, createdAt } = item as Record<string, unknown>;
  if (
    typeof id !== 'string' ||
    typeof prompt !== 'string' ||
    typeof code !== 'string' ||
    typeof createdAt !== 'string'
  ) {
    return null;
  }

  const parsedDate = new Date(createdAt);
  if (Number.isNaN(parsedDate.getTime())) return null;

  return { id, prompt, code, createdAt: parsedDate };
}

export function parseStoredComponents(raw: string | null): GeneratedComponent[] {
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .map(toGeneratedComponent)
    .filter((component): component is GeneratedComponent => component !== null);
}

export function loadHistory(): GeneratedComponent[] {
  try {
    return capHistory(parseStoredComponents(localStorage.getItem(HISTORY_STORAGE_KEY)), MAX_HISTORY_SIZE);
  } catch {
    return [];
  }
}

/**
 * AI가 생성한 code는 react-live가 그대로 실행하는 임의의 JS다. 이를 영속화하면
 * 세션 1회성이었던 실행 위험이 새로고침 이후에도 자동으로 반복 실행되는 지속형
 * 실행 표면이 된다는 점을 감안해야 한다(생성 코드 자체를 신뢰하는 기존 구조의 연장선).
 */
export function saveHistory(components: GeneratedComponent[]): void {
  try {
    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify(capHistory(components, MAX_HISTORY_SIZE)),
    );
  } catch {
    // localStorage 용량 초과 등은 조용히 무시한다 — 히스토리 저장 실패가 컴포넌트 생성 자체를 막아서는 안 된다.
  }
}
