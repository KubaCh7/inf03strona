import { useEffect } from 'react';
import { supabase } from './supabase';
import { exportProgress, PERSISTED_KEYS, useStore } from './store';
import { applyImport } from './sync';

type Session = { token: string; username: string; email: string | null };

function errMsg(e: { message?: string } | null) {
  const m = e?.message ?? 'Nie udało się połączyć z serwerem';
  if (/function .* does not exist|Could not find the function/i.test(m)) return 'Konta nie są jeszcze włączone na serwerze. Spróbuj później.';
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Brak połączenia z serwerem. Sprawdź internet.';
  return m;
}

export async function register(username: string, email: string, password: string): Promise<Session> {
  const { data, error } = await supabase.rpc('auth_register', { p_username: username.trim(), p_email: email.trim() || null, p_password: password });
  if (error) throw new Error(errMsg(error));
  const r = (data as Session[])[0];
  return { token: r.token, username: r.username, email: r.email };
}

export async function login(loginName: string, password: string): Promise<Session> {
  const { data, error } = await supabase.rpc('auth_login', { p_login: loginName.trim(), p_password: password });
  if (error) throw new Error(errMsg(error));
  const r = (data as Session[])[0];
  return { token: r.token, username: r.username, email: r.email };
}

export async function logout() {
  const acc = useStore.getState().account;
  if (acc) await supabase.rpc('auth_logout', { p_token: acc.token }).then(() => {}, () => {});
  useStore.getState().setAccount(null);
  useStore.getState().setAccountSaved(null);
}

export type Remote = { progress: { tables?: Record<string, unknown> } | null; updated_at: string | null; username: string; email: string | null };
export async function loadRemote(token: string): Promise<Remote> {
  const { data, error } = await supabase.rpc('account_load', { p_token: token });
  if (error) throw new Error(errMsg(error));
  const r = (data as Remote[])[0];
  if (!r) throw new Error('Sesja wygasła. Zaloguj się ponownie');
  return r;
}

export async function saveRemote(): Promise<string | null> {
  const acc = useStore.getState().account;
  if (!acc) return null;
  const { data, error } = await supabase.rpc('account_save', { p_token: acc.token, p_data: exportProgress() });
  if (error) throw new Error(errMsg(error));
  useStore.getState().setAccountSaved(data as string);
  return data as string;
}

export async function changePassword(oldPass: string, newPass: string) {
  const acc = useStore.getState().account;
  if (!acc) throw new Error('Nie jesteś zalogowany');
  const { error } = await supabase.rpc('account_change_password', { p_token: acc.token, p_old: oldPass, p_new: newPass });
  if (error) throw new Error(errMsg(error));
}

/** Wczytuje postep z konta na to urzadzenie (zastepuje lokalny). */
export function applyRemote(r: Remote) {
  if (r.progress?.tables) applyImport(r.progress);
  useStore.getState().setAccountSaved(r.updated_at);
}

export const remoteXp = (r: Remote) => Number((r.progress?.tables as { xp?: number } | undefined)?.xp ?? 0);

let applying = false;
/**
 * Automatyczna synchronizacja: przy starcie pobiera nowszy postep z konta (z innego urzadzenia),
 * a kazda zmiana postepu zapisuje sie na koncie po kilku sekundach.
 */
export function useAccountSync() {
  const token = useStore((s) => s.account?.token);
  useEffect(() => {
    if (!token) return;
    let stop = false;
    const pull = async () => {
      try {
        const r = await loadRemote(token);
        const local = useStore.getState().accountSaved;
        if (!stop && r.updated_at && (!local || new Date(r.updated_at) > new Date(local))) {
          applying = true;
          applyRemote(r);
          setTimeout(() => { applying = false; }, 100);
        }
      } catch (e) {
        if (/Sesja wygasła/.test((e as Error).message)) useStore.getState().setAccount(null);
      }
    };
    void pull();
    // po powrocie do karty sprawdz, czy inne urzadzenie czegos nie zapisalo
    const onVis = () => { if (document.visibilityState === 'visible') void pull(); };
    document.addEventListener('visibilitychange', onVis);
    let timer: ReturnType<typeof setTimeout> | null = null;
    let last = JSON.stringify(PERSISTED_KEYS.map((k) => (useStore.getState() as unknown as Record<string, unknown>)[k]));
    const unsub = useStore.subscribe((state) => {
      if (applying) return;
      const now = JSON.stringify(PERSISTED_KEYS.map((k) => (state as unknown as Record<string, unknown>)[k]));
      if (now === last) return;
      last = now;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { void saveRemote().catch(() => {}); }, 4000);
    });
    const onHide = () => { if (document.visibilityState === 'hidden' && timer) { clearTimeout(timer); timer = null; void saveRemote().catch(() => {}); } };
    document.addEventListener('visibilitychange', onHide);
    return () => { stop = true; unsub(); if (timer) clearTimeout(timer); document.removeEventListener('visibilitychange', onVis); document.removeEventListener('visibilitychange', onHide); };
  }, [token]);
}
