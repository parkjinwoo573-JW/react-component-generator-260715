import type { GeneratedComponent } from '../types';

export const HISTORY_STORAGE_KEY = 'react-component-generator:history';
export const MAX_HISTORY_SIZE = 20;

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
    return parseStoredComponents(localStorage.getItem(HISTORY_STORAGE_KEY));
  } catch {
    return [];
  }
}

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
