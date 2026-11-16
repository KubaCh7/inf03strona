// Prezenty i ogloszenia od admina: pobierane przy starcie, po powrocie do karty i co kilka minut.
import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useStore } from './store';

export type Gift = { id: string; created_at: string; coins: number; xp: number; item: string | null; message: string | null; created_by: string; personal: boolean };

/** Odbiera nowe prezenty (kazdy tylko raz) i zwraca liste do pokazania w okienku. */
export function useGifts() {
  const token = useStore((s) => s.account?.token ?? null);
  const [shown, setShown] = useState<Gift[]>([]);

  useEffect(() => {
    let stop = false;
    const check = async () => {
      const { data, error } = await supabase.rpc('gifts_active', { p_token: token });
      if (stop || error || !Array.isArray(data)) return;
      const st = useStore.getState();
      const fresh = (data as Gift[]).filter((g) => !st.claimedGifts.includes(g.id));
      if (!fresh.length) return;
      for (const g of fresh) st.receiveGift(g);
      setShown((s) => [...s, ...fresh]);
    };
    // z kontem: chwila na wczytanie postepu z konta (tam sa juz odebrane prezenty), zeby nie odebrac drugi raz
    const first = setTimeout(check, token ? 4000 : 1500);
    const every = setInterval(check, 60 * 1000);
    const onVis = () => { if (document.visibilityState === 'visible') void check(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { stop = true; clearTimeout(first); clearInterval(every); document.removeEventListener('visibilitychange', onVis); };
  }, [token]);

  // czy zalogowane konto jest adminem
  useEffect(() => {
    if (!token) { useStore.getState().setIsAdmin(false); return; }
    supabase.rpc('account_is_admin', { p_token: token }).then(({ data }) => useStore.getState().setIsAdmin(data === true), () => {});
  }, [token]);

  return { gifts: shown, close: () => setShown([]) };
}

// ---- admin ----
const tok = () => useStore.getState().account?.token;
export async function adminSendGift(g: { target: string | null; coins: number; xp: number; item: string | null; message: string; hours: number }) {
  const { error } = await supabase.rpc('admin_send_gift', { p_token: tok(), p_target: g.target, p_coins: g.coins, p_xp: g.xp, p_item: g.item, p_message: g.message, p_hours: g.hours });
  if (error) throw new Error(error.message);
}
export type SentGift = { id: string; created_at: string; expires_at: string; target: string | null; coins: number; xp: number; item: string | null; message: string | null; created_by: string };
export async function adminListGifts(): Promise<SentGift[]> {
  const { data, error } = await supabase.rpc('admin_list_gifts', { p_token: tok() });
  if (error) throw new Error(error.message);
  return data as SentGift[];
}
export async function adminDeleteGift(id: string) {
  const { error } = await supabase.rpc('admin_delete_gift', { p_token: tok(), p_id: id });
  if (error) throw new Error(error.message);
}
