import { createClient } from '@supabase/supabase-js'
import { Ticket, Asset } from 'ts-types'; // Example of using shared types

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Example of typed usage
export const getTickets = async (): Promise<Ticket[]> => {
  const { data, error } = await supabase.from('tickets').select('*');
  if (error) throw error;
  return data;
}