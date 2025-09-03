import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type Org = { id: string; name: string };

// Minimal hook: relies on RLS to filter accessible organizations
export default function useOrgs() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name")
        .order("name", { ascending: true });
      if (!active) return;
      if (error) {
        setError(error.message);
        setOrgs([]);
      } else {
        setOrgs((data as Org[]) || []);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  return { orgs, loading, error };
}
