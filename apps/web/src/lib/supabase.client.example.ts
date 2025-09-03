// apps/web/src/lib/supabase.client.example.ts
// If your project already has "@/lib/supabase", ignore this file.
// Otherwise, copy this to "supabase.ts" and adjust the import paths in pages/components.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);