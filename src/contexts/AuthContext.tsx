import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  // UPDATE 1: Added phone to the signature
  signUp: (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    isCustomer: boolean
  ) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // UPDATE 2: Added phone parameter
  // UPDATE 2: Added phone parameter and Backend Security Shield
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    isCustomer: boolean
  ) => {
    const redirectUrl = `${window.location.origin}/`;

    // -------------------------------------------------------------
    // 🚨 1. CRITICAL SECURITY SHIELD: Verify via secure backend
    // This prevents Supabase from overwriting unverified account passwords!
    // -------------------------------------------------------------
    try {
      const checkRes = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/auth/check-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      const checkData = await checkRes.json();

      if (checkData.isTaken) {
        const errorMsg =
          "An account with this email already exists. Please log in instead.";
        toast.error(errorMsg);
        return { error: { message: errorMsg } }; // Block Supabase from running
      }
    } catch (err) {
      console.error("Security check failed:", err);
      toast.error("Could not verify email availability. Please try again.");
      return { error: { message: "Security check failed." } };
    }
    // -------------------------------------------------------------

    // 2. Create the user in Supabase (Now 100% safe to execute)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          phone: phone,
          is_customer: isCustomer,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      return { error };
    }

    // 3. Sync the user to our Database
    if (data.user) {
      try {
        await fetch(
          `${import.meta.env.VITE_API_URL}/api/admin/auth/sync-customer`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: data.user.id,
              email: email,
              fullName: fullName,
              phone: phone,
              isCustomer: isCustomer,
            }),
          }
        );
      } catch (syncError) {
        console.error("Failed to sync customer profile to backend:", syncError);
      }
    }

    toast.success("Account created successfully!");
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Signed in successfully!");
    }

    return { error };
  };

  const signOut = async () => {
    // 1. Attempt to sign out from Supabase
    const { error } = await supabase.auth.signOut();

    // 2. Check if the error is just a "Session not found"
    // If it is, the user is effectively signed out already.
    const isGhostSession =
      error?.message?.includes("Auth session missing!") ||
      error?.status === 403;

    if (error && !isGhostSession) {
      toast.error(error.message);
      console.error("Sign out error:", error.code, error.message);
    } else {
      // 3. Force-clear local state regardless of the server error
      // This ensures the UI updates even if the server was grumpy
      setUser(null);
      setSession(null);
      localStorage.clear(); // Clear any persisted state if you have it
      toast.success("Signed out successfully!");

      // Optional: Redirect to auth page if your app doesn't do it automatically via useEffect
      // navigate('/auth');
    }
  };

  const resetPassword = async (email: string) => {
    // Make sure there are no trailing slashes on origin
    const origin = window.location.origin.replace(/\/$/, "");
    const redirectUrl = `${origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(
        "Password reset email sent! Please check your spam folder."
      );
    }

    return { error };
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signUp, signIn, signOut, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
