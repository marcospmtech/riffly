import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type Role = "owner" | "admin" | "user" | null;

export function useRole(): Role {
  const { user } = useAuth();
  const [role, setRole] = useState<Role>(null);

  useEffect(() => {
    if (!user) {
      setRole(null);
      return;
    }
    let cancelled = false;
    void supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (cancelled) return;
        const roles = (data ?? []).map((r) => r.role);
        if (roles.includes("owner")) setRole("owner");
        else if (roles.includes("admin")) setRole("admin");
        else setRole("user");
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return role;
}
