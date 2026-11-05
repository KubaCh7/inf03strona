import { supabase } from './supabase';
import { exportProgress, PERSISTED_KEYS, useStore } from './store';

export async function pushProgress() {
  const { syncCode } = useStore.getState();
  const { data, error } = await supabase.rpc('save_progress', { p_code: syncCode, p_data: exportProgress() });
  if (error) throw error;
  useStore.getState().setSync(syncCode, data as string);
  return data as string;
}

export async function pullProgress(code: string) {
  const { data, error } = await supabase.rpc('load_progress', { p_code: code });
  if (error) throw error;
  const row = (data as { data: { tables: Record<string, unknown> }; updated_at: string }[])[0];
  if (!row) return false;
  applyImport(row.data);
  useStore.getState().setSync(code, row.updated_at);
  return true;
}

export function applyImport(payload: { tables?: Record<string, unknown> }) {
  if (!payload?.tables) throw new Error('Niepoprawny plik');
  const patch: Record<string, unknown> = {};
  for (const k of PERSISTED_KEYS) if (k in payload.tables) patch[k] = payload.tables[k];
  useStore.getState().replaceAll(patch);
}
