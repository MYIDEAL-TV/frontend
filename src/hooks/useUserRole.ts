import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "staff" | "customer" | null;

export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchRole = async () => {
      // Wait for user to be populated
      if (!user) {
        if (isMounted) {
          setRole(null);
          setLoading(false);
        }
        return;
      }

      if (isMounted) setLoading(true);

      try {
        // -----------------------------------------------------------------
        // 🚀 STEP 1: READ ROLE FROM SECURE METADATA (Instant & RLS-Proof)
        // -----------------------------------------------------------------
        const metadata = user.user_metadata || {};
        const metadataRoleId = metadata.role_id;
        
        let normalizedFromMetadata: UserRole = null;

        // Catch self-registered customers first
        if (metadata.is_customer === true) {
          normalizedFromMetadata = "customer";
        } 
        // Catch Admin-created accounts
        else if (metadataRoleId) {
          const roleIdInt = parseInt(metadataRoleId, 10);
          if (roleIdInt === 1 || roleIdInt === 6) normalizedFromMetadata = "admin";
          else if (roleIdInt === 7) normalizedFromMetadata = "staff";
          else if (roleIdInt === 8) normalizedFromMetadata = "customer";
        }

        if (normalizedFromMetadata) {
          console.log("✅ Role loaded instantly from metadata:", normalizedFromMetadata);
          if (isMounted) setRole(normalizedFromMetadata);
          return; // Exit early, no database query needed!
        }

        // -----------------------------------------------------------------
        // 🚀 STEP 2: FALLBACK TO DATABASE (Only if metadata is missing)
        // Note: If this fallback returns null, you need to add an RLS policy 
        // in your Supabase Dashboard allowing users to SELECT their own row!
        // -----------------------------------------------------------------
        console.warn("⚠️ Metadata missing. Falling back to DB query...");
        const { data: staffUser, error: staffError } = await (supabase as any)
          .from("staff_users")
          .select("id, email, role_id")
          .eq("email", user.email)
          .maybeSingle();

        if (staffError || !staffUser?.role_id) {
          console.error("DB Query failed or RLS blocked the read.");
          if (isMounted) setRole(null);
          return;
        }

        const { data: roleRow, error: roleError } = await (supabase as any)
          .from("roles")
          .select("id, name")
          .eq("id", staffUser.role_id)
          .maybeSingle();

        if (roleError || !roleRow) {
          console.error("Failed to fetch role row:", roleError);
          if (isMounted) setRole(null);
          return;
        }

        const dbRoleName = (roleRow?.name || "").toString().toLowerCase();
        let normalizedFromDb: UserRole = null;

        if (dbRoleName === "super admin" || dbRoleName === "admin") {
          normalizedFromDb = "admin";
        } else if (dbRoleName === "staff") {
          normalizedFromDb = "staff";
        } else if (dbRoleName === "customer") {
          normalizedFromDb = "customer";
        }

        if (isMounted) {
          console.log("✅ Role loaded from fallback database:", normalizedFromDb);
          setRole(normalizedFromDb);
        }
      } catch (err) {
        console.error("Unexpected error in useUserRole:", err);
        if (isMounted) setRole(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRole();

    return () => {
      isMounted = false;
    };
  }, [user]);

  return {
    role,
    isAdmin: role === "admin",
    isStaff: role === "staff",
    isCustomer: role === "customer",
    isAuthorized: role === "admin" || role === "staff" || role === "customer",
    loading,
  };
};