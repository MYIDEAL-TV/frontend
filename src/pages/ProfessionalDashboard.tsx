import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/ui/navigation";
// Update this line:
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  FileSignature,
  Tv,
  User,
  MapPin,
  FileEdit,
  ListVideo,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Eye, Mail, Lock, LockOpen, Search } from "lucide-react";

const ProfileDashboard = () => {
  // ==========================================================================
  // 1. ALL HOOKS MUST BE DECLARED HERE AT THE TOP
  // ==========================================================================
  const { user } = useAuth();
  const { isCustomer, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State Hooks - Existing
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>({});
  const [activeSubs, setActiveSubs] = useState<any[]>([]);
  const [pendingContracts, setPendingContracts] = useState<any[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [savedProposals, setSavedProposals] = useState<any[]>([]);

  // State Hooks - NEW: Flex Channels
  const [flexData, setFlexData] = useState<any>(null); // Holds the full payload
  const [activeFlexSubId, setActiveFlexSubId] = useState<string | null>(null); // Which sub is currently being edited
  const [selectedFlexIds, setSelectedFlexIds] = useState<number[]>([]); // Current selections for the active sub
  const [loadingFlex, setLoadingFlex] = useState(true);
  const [savingFlex, setSavingFlex] = useState(false);
  const [unlockCode, setUnlockCode] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [flexSearchQuery, setFlexSearchQuery] = useState("");
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [pendingCodeRequests, setPendingCodeRequests] = useState<
    Record<string, boolean>
  >({});

  // --- NEW: REQUEST FLEX CODE ---
  const handleRequestCode = async () => {
    if (!activeFlexSubId) return;
    setIsRequestingCode(true);

    try {
      const headers = await getSecureHeaders();
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/subscriptions/request-code`, // Ensure this matches your backend route
        {
          method: "POST",
          headers,
          body: JSON.stringify({ subscriptionId: activeFlexSubId }),
        }
      );

      const data = await res.json();
      if (data.success) {
        toast({
          title: "Request Sent",
          description:
            "Your request for an unlock code has been sent to Support.",
        });
        // Mark this specific subscription as having a pending request locally
        setPendingCodeRequests((prev) => ({
          ...prev,
          [activeFlexSubId]: true,
        }));
      } else {
        throw new Error(data.error || "Failed to request code.");
      }
    } catch (err: any) {
      toast({
        title: "Request Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsRequestingCode(false);
    }
  };

  // --- EXISTING FETCH FUNCTION ---
  const handleViewDetails = async (subId: string) => {
    setIsDetailsOpen(true);
    setLoadingDetails(true);
    setSelectedDetails(null); // Clear previous data

    try {
      const headers = await getSecureHeaders();
      const res = await fetch(
        `${
          import.meta.env.VITE_API_URL
        }/api/customer/subscription/${subId}/details`,
        { headers }
      );

      if (!res.ok) throw new Error("Failed to fetch details");
      console.log("Raw details response:", await res.clone().text()); // Log raw response for debugging
      const data = await res.json();
      if (data.success) {
        setSelectedDetails(data.details); // This is the pricing_snapshot JSON
      } else {
        throw new Error(data.error || "Failed");
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Could not load subscription details.",
        variant: "destructive",
      });
      setIsDetailsOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Effect Hook: Role Protection
  useEffect(() => {
    if (!roleLoading && !isCustomer) {
      toast({
        title: "Access Denied",
        description: "This page is reserved for customers.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [roleLoading, isCustomer, navigate, toast]);

  // Effect Hook: Data Fetching
  useEffect(() => {
    if (isCustomer) {
      fetchDashboardData();
      fetchFlexData(); // NEW: Fetch Flex channels configuration
    }
  }, [isCustomer]);

  // ==========================================================================
  // 2. HELPER FUNCTIONS & EVENT HANDLERS
  // ==========================================================================

  const getSecureHeaders = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchDashboardData = async () => {
    try {
      const headers = await getSecureHeaders();
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/customer/dashboard`,
        { headers }
      );

      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        setActiveSubs(data.activeSubscriptions);
        setPendingContracts(data.pendingContracts);
        setSavedProposals(data.savedProposals || []);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load dashboard data.",
        variant: "destructive",
      });
    } finally {
      setDataLoading(false);
    }
  };

  // --- NEW: FETCH FLEX CHANNELS DATA ---
  const fetchFlexData = async () => {
    setLoadingFlex(true);
    try {
      const headers = await getSecureHeaders();
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/subscriptions/flex-data`,
        { headers }
      );

      const data = await res.json();
      if (data.success && data.data) {
        setFlexData(data.data);

        // Auto-select the first FLEX ELIGIBLE subscription by default
        const firstFlexSub = data.data.subscriptions.find(
          (s: any) => s.isFlexPackage
        );
        if (firstFlexSub) {
          setActiveFlexSubId(firstFlexSub.subscriptionId);
          setSelectedFlexIds(firstFlexSub.selectedChannelIds || []);
        }
      }
    } catch (err) {
      console.error("Flex channel fetch error:", err);
    } finally {
      setLoadingFlex(false);
    }
  };

  // Handle Switching Subscriptions in the Flex Tab
  const handleSwitchFlexSubscription = (subId: string) => {
    const sub = flexData.subscriptions.find(
      (s: any) => s.subscriptionId === subId
    );
    if (sub) {
      setActiveFlexSubId(subId);
      setSelectedFlexIds(sub.selectedChannelIds || []);
      setIsUnlocked(false); // Lock the UI
      setUnlockCode(""); // Clear the code
    }
  };
  const handleUnlock = async () => {
    if (!unlockCode || unlockCode.trim().length < 5) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid code.",
        variant: "destructive",
      });
      return;
    }

    setIsUnlocking(true);
    try {
      const headers = await getSecureHeaders();
      const res = await fetch(
        `${
          import.meta.env.VITE_API_URL
        }/api/admin/subscriptions/flex-unlock/validate`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            subscriptionId: activeFlexSubId,
            code: unlockCode.trim(),
          }),
        }
      );

      const data = await res.json();
      if (data.success) {
        setIsUnlocked(true);
        toast({
          title: "Unlocked",
          description: "You can now modify your channels.",
        });
      } else {
        throw new Error(data.error || "Invalid code");
      }
    } catch (err: any) {
      toast({
        title: "Validation Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsUnlocking(false);
    }
  };
  // --- NEW: TOGGLE FLEX CHANNEL ---
  const toggleFlexChannel = (channelId: number) => {
    if (!isUnlocked) return;
    if (!flexData || !activeFlexSubId) return;
    const activeSub = flexData.subscriptions.find(
      (s: any) => s.subscriptionId === activeFlexSubId
    );
    if (!activeSub) return;

    const totalAllowedFree =
      activeSub.flexAllowed * (activeSub.planQuantity || 1);

    setSelectedFlexIds((prev) => {
      if (prev.includes(channelId)) {
        return prev.filter((id) => id !== channelId); // Deselect
      }
      if (prev.length >= totalAllowedFree) {
        toast({
          title: "Limit Reached",
          description: `The package for ${activeSub.nickname} allows a maximum of ${totalAllowedFree} channels.`,
          variant: "destructive",
        });
        return prev;
      }
      return [...prev, channelId];
    });
  };

  // --- NEW: SAVE FLEX CHANNELS ---
  const handleSaveFlexChannels = async () => {
    if (!activeFlexSubId) return;
    setSavingFlex(true);

    try {
      const headers = await getSecureHeaders();
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/subscriptions/flex-data`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            subscriptionId: activeFlexSubId,
            selectedChannelIds: selectedFlexIds,
            unlockCode,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.error || "Failed to save.");

      toast({
        title: "Success",
        description: "Your Flex Channels have been updated successfully.",
      });

      // Refresh to ensure sync
      fetchFlexData();
      setIsUnlocked(false);
      setUnlockCode("");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Could not save your channel selections.",
        variant: "destructive",
      });
    } finally {
      setSavingFlex(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const headers = await getSecureHeaders();
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/customer/profile`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({
            fullName: profile.full_name,
            phone: profile.cell_phone,
            companyName: profile.company_name,
            address: profile.address,
            city: profile.city,
            postalCode: profile.postal_code,
          }),
        }
      );

      if (res.ok) {
        toast({
          title: "Success",
          description: "Profile updated successfully.",
        });
      } else {
        throw new Error("Update failed");
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An error occurred while updating your profile.",
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      return toast({
        title: "Invalid Password",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Password updated successfully.",
      });
      setNewPassword("");
    }
    setSaving(false);
  };

  const handleUpdateNickname = async (subId: string, currentName: string) => {
    const nickname = prompt(
      "Enter a nickname for this location (e.g., Main House):",
      currentName || ""
    );
    if (!nickname) return;

    try {
      const headers = await getSecureHeaders();
      const res = await fetch(
        `${
          import.meta.env.VITE_API_URL
        }/api/customer/subscription/${subId}/nickname`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({ nickname }),
        }
      );

      if (res.ok) {
        toast({ title: "Success", description: "Location nickname updated." });
        fetchDashboardData();
      } else {
        throw new Error("Failed");
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update nickname.",
        variant: "destructive",
      });
    }
  };

  // ==========================================================================
  // 3. CONDITIONAL RENDERING
  // ==========================================================================

  if (roleLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isCustomer) return null;

  // ==========================================================================
  // 4. MAIN UI RENDER
  // ==========================================================================

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container max-w-5xl mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-8">My Account</h1>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-2 w-full max-w-3xl border-b-0 pb-0 justify-start">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            {/* NEW FLEX TAB */}
            <TabsTrigger value="flex" className="flex items-center gap-2">
              <ListVideo className="w-4 h-4" /> Flex Channels
            </TabsTrigger>
            <TabsTrigger value="contracts">Pending Contracts</TabsTrigger>
            <TabsTrigger value="drafts">Saved Drafts</TabsTrigger>
          </TabsList>

          {/* PROFILE TAB */}
          <TabsContent value="profile">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Existing Profile Forms... */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" /> Personal Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Email (Locked)</Label>
                      <Input
                        value={profile.email || ""}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input
                        value={profile.full_name || ""}
                        onChange={(e) =>
                          setProfile({ ...profile, full_name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input
                        value={profile.cell_phone || ""}
                        onChange={(e) =>
                          setProfile({ ...profile, cell_phone: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Company Name (Optional)</Label>
                      <Input
                        value={profile.company_name || ""}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            company_name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input
                          value={profile.city || ""}
                          onChange={(e) =>
                            setProfile({ ...profile, city: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Postal Code</Label>
                        <Input
                          value={profile.postal_code || ""}
                          onChange={(e) =>
                            setProfile({
                              ...profile,
                              postal_code: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Input
                        value={profile.address || ""}
                        onChange={(e) =>
                          setProfile({ ...profile, address: e.target.value })
                        }
                      />
                    </div>
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>Update your login password</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    <div className="space-y-2">
                      <Label>New Password</Label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="secondary"
                      disabled={saving || !newPassword}
                    >
                      Update Password
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* FLEX CHANNELS TAB - MULTI-SUBSCRIPTION UI */}
          <TabsContent value="flex">
            <Card>
              <CardHeader className="flex flex-col space-y-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ListVideo className="h-6 w-6 text-primary" /> Flex Channels
                    Configuration
                  </CardTitle>
                  <CardDescription>
                    Consult the flex channels included in your package. You need
                    an unlock code to modify these.
                  </CardDescription>
                </div>
                {/* SUBSCRIPTION SELECTOR */}
                {flexData?.subscriptions?.length > 0 && (
                  <div className="flex flex-col space-y-2 pt-2 border-t">
                    <Label className="text-muted-foreground">
                      Select Subscription to View/Configure:
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {flexData.subscriptions.map((sub: any) => (
                        <Button
                          key={sub.subscriptionId}
                          variant={
                            activeFlexSubId === sub.subscriptionId
                              ? "default"
                              : "outline"
                          }
                          onClick={() =>
                            handleSwitchFlexSubscription(sub.subscriptionId)
                          }
                          className={!sub.isFlexPackage ? "opacity-50" : ""}
                        >
                          {sub.nickname}{" "}
                          {!sub.isFlexPackage && " (Not Eligible)"}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardHeader>

              <CardContent>
                {loadingFlex ? (
                  <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : !flexData || flexData.subscriptions.length === 0 ? (
                  <div className="text-center p-12 border-2 border-dashed rounded-xl opacity-80 bg-muted/30">
                    <ListVideo className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">
                      No Subscriptions Found
                    </h3>
                  </div>
                ) : (
                  (() => {
                    const activeSub = flexData.subscriptions.find(
                      (s: any) => s.subscriptionId === activeFlexSubId
                    );
                    if (!activeSub) return null;
                    if (!activeSub.isFlexPackage) {
                      return (
                        <div className="text-center p-12 border-2 border-dashed rounded-xl opacity-80 bg-muted/30 mt-4">
                          <ListVideo className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                          <h3 className="text-lg font-semibold mb-2">
                            Not Available
                          </h3>
                          <p className="text-muted-foreground">
                            This package does not include Flex Channels.
                          </p>
                        </div>
                      );
                    }

                    // Calculate Free Limit Context
                    const totalAllowedFree =
                      activeSub.flexAllowed * (activeSub.planQuantity || 1);

                    return (
                      <div className="mt-4 space-y-6">
                        {/* UNLOCK CODE UI */}
                        {!isUnlocked ? (
                          <div className="flex flex-col items-center p-8 bg-muted/20 rounded-xl border border-border/50">
                            <Lock className="w-12 h-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold">
                              Modification Locked
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4 max-w-sm text-center">
                              You can currently consult your active flex
                              channels below. To modify your selections, please
                              enter the unique unlock code provided by Support.
                            </p>
                            <div className="flex gap-2 w-full max-w-sm mb-6">
                              <Input
                                value={unlockCode}
                                onChange={(e) => setUnlockCode(e.target.value)}
                                placeholder="Enter 6-digit Unlock Code"
                                className="bg-background"
                              />
                              <Button
                                onClick={handleUnlock}
                                disabled={isUnlocking}
                              >
                                {isUnlocking ? "Checking..." : "Unlock"}
                              </Button>
                            </div>

                            <Separator className="w-full max-w-sm mb-6" />

                            <div className="text-center w-full max-w-sm">
                              <p className="text-sm font-medium text-foreground mb-2">
                                Need to make a change?
                              </p>
                              <Button
                                variant="outline"
                                className="w-full border-primary/50 text-primary hover:bg-primary/5"
                                onClick={handleRequestCode}
                                disabled={
                                  isRequestingCode ||
                                  activeSub.hasPendingRequest ||
                                  pendingCodeRequests[activeFlexSubId]
                                }
                              >
                                {isRequestingCode ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Mail className="mr-2 h-4 w-4" />
                                )}
                                {activeSub.hasPendingRequest ||
                                pendingCodeRequests[activeFlexSubId]
                                  ? "Unlock Request Pending..."
                                  : "Request Unlock Code"}
                              </Button>
                              {(activeSub.hasPendingRequest ||
                                pendingCodeRequests[activeFlexSubId]) && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Support has received your request. Please wait
                                  for an email with your code.
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between bg-green-50/50 border border-green-200 p-4 rounded-lg">
                            <div className="text-sm font-medium text-green-800">
                              <LockOpen className="w-4 h-4 inline-block mr-2 mb-0.5" />
                              Modification Unlocked. You may now update your
                              channels.
                            </div>
                            <Button
                              onClick={handleSaveFlexChannels} // Ensure to append unlockCode to your body in the function!
                              disabled={savingFlex || loadingFlex}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {savingFlex ? "Saving..." : "Save New Selections"}
                            </Button>
                          </div>
                        )}

                        {/* CHANNELS GRID */}
                        <div>
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="font-semibold">Channel Selection</h4>
                            <Badge
                              variant={
                                selectedFlexIds.length > totalAllowedFree
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {selectedFlexIds.length} / {totalAllowedFree} Free
                              Slots Used
                            </Badge>
                          </div>

                          <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search channels..."
                              value={flexSearchQuery}
                              onChange={(e) =>
                                setFlexSearchQuery(e.target.value)
                              }
                              className="pl-9 max-w-md text-foreground bg-background"
                            />
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {flexData.eligibleChannels
                              .filter(
                                (channel: any) =>
                                  !activeSub.excludedChannelIds?.includes(
                                    channel.id
                                  )
                              )
                              .filter((channel: any) =>
                                channel.name
                                  .toLowerCase()
                                  .includes(flexSearchQuery.toLowerCase())
                              )
                              .map((channel: any) => {
                                const isSelected = selectedFlexIds.includes(
                                  channel.id
                                );
                                return (
                                  <div
                                    key={channel.id}
                                    onClick={() =>
                                      isUnlocked &&
                                      toggleFlexChannel(channel.id)
                                    }
                                    className={`
                                    relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200
                                    ${
                                      isUnlocked
                                        ? "cursor-pointer"
                                        : "cursor-not-allowed opacity-90"
                                    }
                                    ${
                                      isSelected
                                        ? "border-primary bg-primary/5 shadow-sm"
                                        : "border-muted"
                                    }
                                    ${
                                      isUnlocked && !isSelected
                                        ? "hover:border-primary/50 hover:bg-muted/30"
                                        : ""
                                    }
                                  `}
                                  >
                                    {isSelected && (
                                      <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-primary" />
                                    )}
                                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-3 overflow-hidden">
                                      {channel.logo_url ? (
                                        <img
                                          src={channel.logo_url}
                                          alt={channel.name}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <span className="text-muted-foreground font-semibold text-lg">
                                          {channel.name.charAt(0)}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-center font-medium text-sm">
                                      {channel.name}
                                    </span>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SUBSCRIPTIONS TAB */}
          <TabsContent value="subscriptions">
            <div className="grid gap-4">
              {activeSubs.length === 0 ? (
                <p className="text-muted-foreground p-4 bg-muted/30 rounded-lg border border-dashed">
                  You have no active subscriptions at the moment.
                </p>
              ) : (
                activeSubs.map((sub) => (
                  <Card key={sub.subscription_id}>
                    <CardContent className="flex flex-col sm:flex-row items-center justify-between p-6 gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 text-green-700 rounded-full">
                          <Tv className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">
                            {sub.nickname || "Unnamed Location"}
                          </h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> ID:{" "}
                            {sub.subscription_id.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(sub.subscription_id)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" /> View Details
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleUpdateNickname(
                              sub.subscription_id,
                              sub.nickname
                            )
                          }
                        >
                          Edit Label
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* PENDING CONTRACTS TAB */}
          <TabsContent value="contracts">
            <div className="grid gap-4">
              {pendingContracts.length === 0 ? (
                <p className="text-muted-foreground p-4 bg-muted/30 rounded-lg border border-dashed">
                  You have no pending documents to sign.
                </p>
              ) : (
                pendingContracts.map((contract) => (
                  <Card
                    key={contract.contract_id}
                    className="border-orange-200 bg-orange-50/50"
                  >
                    <CardContent className="flex flex-col sm:flex-row items-center justify-between p-6 gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-100 text-orange-700 rounded-full">
                          <FileSignature className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-orange-900">
                            Action Required: Signature Needed
                          </h3>
                          <p className="text-sm text-orange-700">
                            {contract.nickname
                              ? `For: ${contract.nickname}`
                              : "New Subscription Agreement"}
                          </p>
                          {contract.contract_created_at && (
                            <p className="text-xs font-medium text-orange-600/80 mt-1">
                              Generated:{" "}
                              {new Date(
                                contract.contract_created_at
                              ).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                      {contract.signnow_link ? (
                        <Button
                          asChild
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                          <a
                            href={contract.signnow_link}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Sign Document Now
                          </a>
                        </Button>
                      ) : (
                        <Button disabled variant="outline">
                          Awaiting Link...
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* DRAFTS TAB */}
          <TabsContent value="drafts">
            <div className="grid gap-4 mt-6">
              {savedProposals.length === 0 ? (
                <div className="text-center p-8 border-2 border-dashed rounded-xl opacity-60">
                  <p>You have no saved drafts at the moment.</p>
                </div>
              ) : (
                savedProposals.map((draft) => (
                  <Card
                    key={draft.id}
                    className="bg-muted/30 border-primary/20"
                  >
                    <CardContent className="flex items-center justify-between p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-full text-primary">
                          <FileEdit className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold">
                            {(typeof draft.form_data?.selectedPlan === "string"
                              ? draft.form_data.selectedPlan
                              : draft.form_data?.selectedPlan?.name
                            )
                              ?.replace("_", " ")
                              .toUpperCase() || "Incomplete Subscription"}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Saved on{" "}
                            {new Date(draft.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() =>
                          navigate("/new-subscription", {
                            state: {
                              usr: { ...draft.form_data, proposalId: draft.id },
                            },
                          })
                        }
                        variant="outline"
                        className="hover:bg-primary hover:text-white"
                      >
                        Resume Draft
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      {/* ========================================================= */}
      {/* SUBSCRIPTION DETAILS MODAL                                */}
      {/* ========================================================= */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Subscription Details</DialogTitle>
            <DialogDescription>
              A complete breakdown of your active plan, hardware, and services.
            </DialogDescription>
          </DialogHeader>

          {loadingDetails ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : selectedDetails ? (
            <div className="space-y-6 mt-4">
              {/* CORE PLAN */}
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Tv className="h-5 w-5 text-primary" /> Core Plan
                </h3>
                <div className="bg-muted/30 p-4 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Plan Name</span>
                    <Badge
                      variant="outline"
                      className="font-medium uppercase bg-background"
                    >
                      {(typeof selectedDetails.selectedPlan === "string"
                        ? selectedDetails.selectedPlan
                        : selectedDetails.selectedPlan?.name
                      )?.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Contract Type</span>
                    <span className="font-medium capitalize">
                      {selectedDetails.contractType}
                    </span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Plan Quantity</span>
                    <span className="font-medium">
                      {selectedDetails.planQuantity}
                    </span>
                  </div>
                  {selectedDetails.additionalScreens > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        Additional Screens
                      </span>
                      <span className="font-medium">
                        {selectedDetails.additionalScreens}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Screens</span>
                    <span className="font-bold text-primary">
                      {selectedDetails.totalScreens}
                    </span>
                  </div>
                </div>
              </div>

              {/* MONTHLY RECURRING (ADDONS & CUSTOM) */}
              {(selectedDetails.addons?.length > 0 ||
                selectedDetails.extraFlexCost > 0 ||
                selectedDetails.customItemPrice > 0) && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <ListVideo className="h-5 w-5 text-primary" /> Monthly
                    Add-ons
                  </h3>
                  <div className="bg-muted/30 p-4 rounded-lg space-y-2 text-sm">
                    {selectedDetails.addons?.map((addon: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center"
                      >
                        <span className="text-muted-foreground">
                          {addon.name}{" "}
                          <span className="text-xs opacity-70">
                            (Qty:{" "}
                            {addon.quantity ?? selectedDetails.planQuantity})
                          </span>
                        </span>
                        <span className="font-medium">
                          {selectedDetails.currency === "USD" ? "$" : "€"}
                          {(
                            Number(addon.price) *
                            Number(
                              addon.quantity ?? selectedDetails.planQuantity
                            )
                          ).toFixed(2)}{" "}
                          /mo
                        </span>
                      </div>
                    ))}
                    {/* {selectedDetails.extraFlexCost > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">
                          Extra Flex Channels
                        </span>
                        <span className="font-medium text-orange-600">
                          {selectedDetails.currency === "USD" ? "$" : "€"}
                          {Number(selectedDetails.extraFlexCost).toFixed(2)} /mo
                        </span>
                      </div>
                    )} */}
                    {selectedDetails.customItemPrice > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">
                          {selectedDetails.customItemName ||
                            "Custom Recurring Fee"}
                        </span>
                        <span className="font-medium">
                          {selectedDetails.currency === "USD" ? "$" : "€"}
                          {Number(selectedDetails.customItemPrice).toFixed(
                            2
                          )}{" "}
                          /mo
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* HARDWARE & EQUIPMENT */}
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" /> Hardware & Equipment
                </h3>
                <div className="bg-muted/30 p-4 rounded-lg space-y-3 text-sm">
                  {selectedDetails.selectedDecoders?.length > 0 ? (
                    selectedDetails.selectedDecoders.map(
                      (decoder: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex justify-between items-start border-b border-border/50 pb-2 last:border-0 last:pb-0"
                        >
                          <div>
                            <p className="font-medium">{decoder.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Quantity: {decoder.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            {Number(decoder.upfrontPrice) > 0 && (
                              <p className="font-medium text-xs">
                                Upfront:{" "}
                                {selectedDetails.currency === "USD" ? "$" : "€"}
                                {(
                                  Number(decoder.upfrontPrice) *
                                  decoder.quantity
                                ).toFixed(2)}
                              </p>
                            )}
                            {Number(decoder.monthlyPrice) > 0 && (
                              <p className="font-medium text-xs text-blue-600">
                                Monthly:{" "}
                                {selectedDetails.currency === "USD" ? "$" : "€"}
                                {(
                                  Number(decoder.monthlyPrice) *
                                  decoder.quantity
                                ).toFixed(2)}{" "}
                                /mo
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    )
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        Hardware Policy
                      </span>
                      <span className="font-medium">
                        {selectedDetails.decoderRental
                          ? "Rental Included"
                          : "No Hardware Selected"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ONE-TIME FEES */}
              {(selectedDetails.selectedFees?.length > 0 ||
                selectedDetails.autrePoncCost > 0) && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <FileSignature className="h-5 w-5 text-primary" /> One-Time
                    Setup & Fees
                  </h3>
                  <div className="bg-muted/30 p-4 rounded-lg space-y-2 text-sm">
                    {selectedDetails.selectedFees?.map(
                      (fee: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center"
                        >
                          <span className="text-muted-foreground">
                            {fee.name}
                          </span>
                          <span className="font-medium">
                            {selectedDetails.currency === "USD" ? "$" : "€"}
                            {Number(fee.price).toFixed(2)}
                          </span>
                        </div>
                      )
                    )}
                    {selectedDetails.autrePoncCost > 0 && (
                      <div className="flex justify-between items-center border-t border-border/50 pt-2 mt-2">
                        <span className="text-muted-foreground">
                          {selectedDetails.autrePoncText || "Custom Fee"}
                        </span>
                        <span className="font-medium">
                          {selectedDetails.currency === "USD" ? "$" : "€"}
                          {Number(selectedDetails.autrePoncCost).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 🚀 TOTALS SECTION 🚀 */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm text-primary">
                      Monthly Recurring
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-4 space-y-1 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal (HT):</span>
                      <span>
                        {selectedDetails.currency === "USD" ? "$" : "€"}
                        {Number(selectedDetails.monthlyHT).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>
                        {selectedDetails.taxDesc} (
                        {(Number(selectedDetails.taxAmount) * 100).toFixed(0)}
                        %):
                      </span>
                      <span>
                        {selectedDetails.currency === "USD" ? "$" : "€"}
                        {Number(selectedDetails.monthlyTaxes).toFixed(2)}
                      </span>
                    </div>
                    <Separator className="my-2 border-primary/10" />
                    <div className="flex justify-between font-bold text-lg text-primary">
                      <span>Total (TTC):</span>
                      <span>
                        {selectedDetails.currency === "USD" ? "$" : "€"}
                        {Number(selectedDetails.monthlyTotal).toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-orange-50 border-orange-200">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm text-orange-800">
                      One-Time Upfront
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-4 space-y-1 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal (HT):</span>
                      <span>
                        {selectedDetails.currency === "USD" ? "$" : "€"}
                        {Number(selectedDetails.oneTimeHT).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>
                        {selectedDetails.taxDesc} (
                        {(Number(selectedDetails.taxAmount) * 100).toFixed(0)}
                        %):
                      </span>
                      <span>
                        {selectedDetails.currency === "USD" ? "$" : "€"}
                        {Number(selectedDetails.oneTimeTaxes).toFixed(2)}
                      </span>
                    </div>
                    <Separator className="my-2 border-orange-200" />
                    <div className="flex justify-between font-bold text-lg text-orange-900">
                      <span>Total (TTC):</span>
                      <span>
                        {selectedDetails.currency === "USD" ? "$" : "€"}
                        {Number(selectedDetails.oneTimeTotal).toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground p-4">
              No details found.
            </p>
          )}

          <DialogFooter className="mt-6 sm:justify-between border-t pt-4">
            <Button
              variant="outline"
              asChild
              className="border-destructive text-destructive hover:bg-destructive/10"
            >
              <a href="mailto:support@idealtv.com?subject=Cancellation/Support Request">
                <Mail className="mr-2 h-4 w-4" /> Request Support or Cancel
              </a>
            </Button>
            <Button onClick={() => setIsDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileDashboard;
