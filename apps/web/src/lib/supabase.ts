import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Ticket, Asset } from 'ts-types'; // Example of using shared types

// Lazily create the Supabase client only when env vars are present.
// This prevents build-time crashes on platforms (e.g. Vercel) where
// NEXT_PUBLIC_* envs may not be injected during server compilation for SSG.
let supabaseSingleton: SupabaseClient | null = null;

function ensureClient(): SupabaseClient {
  if (supabaseSingleton) return supabaseSingleton;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // Provide a clearer error for runtime (and allow build to continue)
    throw new Error('Supabase env vars missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  supabaseSingleton = createClient(url, key);
  return supabaseSingleton;
}

// Export a proxy-like accessor to keep existing import usages working.
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (ensureClient() as any)[prop];
  }
}) as SupabaseClient;

export const getTickets = async (): Promise<Ticket[]> => {
  const client = ensureClient();
  const { data, error } = await client.from('tickets').select('*');
  if (error) throw error;
  return data as Ticket[];
}