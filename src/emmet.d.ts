declare module 'emmet' {
  type Cfg = { type?: 'markup' | 'stylesheet'; syntax?: string; options?: Record<string, unknown>; variables?: Record<string, string> };
  export function resolveConfig(cfg?: Cfg): { snippets: Record<string, string> };
  export default function expand(abbr: string, cfg?: Cfg): string;
}
