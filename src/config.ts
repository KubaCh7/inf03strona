// Klucz publishable jest jawny z definicji (dziala tylko z RLS). Mozna nadpisac zmiennymi VITE_*.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://yzipcrmmbyzlmypdjnjg.supabase.co';
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_ApN3vDPvrJRIhoAWGSejSg_5toJc9u0';
