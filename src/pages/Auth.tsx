import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast"; // 🚀 ADDED
import { supabase } from "@/integrations/supabase/client"; // 🚀 ADDED

const Auth = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("auth");
  const { toast } = useToast(); // 🚀 ADDED
  const { user, signIn, signUp, resetPassword, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isCustomer, setIsCustomer] = useState(true);

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupFullName, setSignupFullName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");

  // Reset password form
  const [resetEmail, setResetEmail] = useState("");

  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(loginEmail, loginPassword);

    if (!error) {
      navigate("/");
    }

    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // -------------------------------------------------------------
    // 🚨 CRITICAL SECURITY SHIELD: Block existing emails BEFORE signup
    // -------------------------------------------------------------
    try {
      const emailToCheck = signupEmail.trim();

      // 🚀 FIX: ONLY check the staff_users table (Portal Access).
      // We ignore the subscribers table because people with contracts
      // are allowed to create brand new portal accounts!
      const { data } = await supabase
        .from("staff_users")
        .select("email")
        .ilike("email", emailToCheck)
        .maybeSingle();

      if (data) {
        toast({
          title: "Registration Blocked",
          description:
            "A portal account with this email already exists. Please switch to the Login tab.",
          variant: "destructive",
        });
        setIsLoading(false);
        return; // 🛑 IMMEDIATELY STOP FLOW
      }
    } catch (err) {
      console.error("Duplicate check failed:", err);
    }
    // -------------------------------------------------------------
    const { error } = await signUp(
      signupEmail,
      signupPassword,
      signupFullName,
      signupPhone,
      isCustomer
    );

    if (!error) {
      toast({
        title: "Success",
        description: "Account created successfully.",
      });
      navigate("/");
    } else {
      toast({
        title: "Signup Failed",
        description: error.message || "Could not create account.",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    await resetPassword(resetEmail);
    toast({
      title: "Email Sent",
      description: "Check your inbox for password reset instructions.",
    });
    setResetEmail("");

    setIsLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Users className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t("tabs.login")}</TabsTrigger>
              <TabsTrigger value="signup">{t("tabs.signup")}</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">{t("fields.email")}</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="staff@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">{t("fields.password")}</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? `${t("buttons.login")}...` : t("buttons.login")}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">{t("fields.fullName")}</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={signupFullName}
                    onChange={(e) => setSignupFullName(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t("fields.email")}</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="staff@example.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                {isCustomer && (
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">
                      {t("fields.phone", "Phone Number")}
                    </Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="+1234567890"
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="signup-password">
                    {t("fields.password")}
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 6 characters
                  </p>
                </div>
                <div className="flex items-center space-x-2 py-2">
                  <input
                    type="checkbox"
                    id="is-customer"
                    checked={isCustomer}
                    onChange={(e) => setIsCustomer(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label
                    htmlFor="is-customer"
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    Register as a customer
                  </Label>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading
                    ? `${t("buttons.signup")}...`
                    : t("buttons.signup")}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                const email = prompt(t("messages.enterEmail"));
                if (email) {
                  setResetEmail(email);
                  handleResetPassword({ preventDefault: () => {} } as any);
                }
              }}
              className="text-sm text-primary hover:underline"
              disabled={isLoading}
            >
              {t("buttons.forgotPassword")}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
