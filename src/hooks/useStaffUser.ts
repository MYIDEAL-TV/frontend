import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface StaffUserInfo {
  staffUserId: string | null;
  staffEmail: string | null;
  staffFullName: string | null;
}

export const useStaffUser = () => {
  const { user } = useAuth();
  const [staffInfo, setStaffInfo] = useState<StaffUserInfo>({
    staffUserId: null,
    staffEmail: null,
    staffFullName: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStaffInfo = async () => {
      // DEBUG: Check if Auth thinks we are logged in
      console.log("Auth User ID:", user?.id);

      if (!user) {
        setStaffInfo({ staffUserId: null, staffEmail: null, staffFullName: null });
        setLoading(false);
        return;
      }

      try {
        // Query by ID (Matches Auth UID)
        const { data, error } = await supabase
          .from('staff_users')
          .select('id, email, full_name')
          .eq('id', user.id) 
          .maybeSingle();

        if (error) {
          console.error('RLS/DB Error fetching staff user:', error);
          setStaffInfo({ staffUserId: null, staffEmail: null, staffFullName: null });
        } else if (data) {
          console.log("Staff Found:", data);
          setStaffInfo({
            staffUserId: data.id,
            staffEmail: data.email,
            staffFullName: data.full_name,
          });
        } else {
           console.warn("User ID not found in public.staff_users table. Check Database.");
           setStaffInfo({ staffUserId: null, staffEmail: null, staffFullName: null });
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStaffInfo();
  }, [user]);

  return { ...staffInfo, loading };
};