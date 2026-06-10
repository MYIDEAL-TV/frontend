import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/ui/navigation";
import {
  ArrowLeft,
  CheckCircle,
  Download,
  Mail,
  Home,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getPlanPrice, getAddonPrice } from "@/config/pricingConfig";
import { useTranslation } from "react-i18next";
import { useUserRole } from "@/hooks/useUserRole";
import { useStaffUser } from "@/hooks/useStaffUser";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// --- INTERFACES ---
interface OwnerInfo {
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string;
  landlinePhone?: string;
  companyName?: string;
  accommodationName?: string;
  address: string;
  city: string;
  postalCode: string;
  country?: string;
  acceptsMarketing: boolean;
}

interface ManagerInfo {
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string;
  companyName?: string;
  address: string;
  city: string;
  postalCode: string;
}

interface FinancialManagerInfo {
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string;
  landlinePhone?: string;
}

interface DeliveryInfo {
  address: string;
  city: string;
  postalCode: string;
  cellPhone: string;
}

interface SubscriptionData {
  satelliteDishComment: any;
  originalPlan?: any;
  decoderPurchaseComment: any;
  decoderRentalComment: any;
  planComment: any;
  installFeeComment: any;
  connectionFeeComment: any;
  addonComments: any;
  location: string;
  originalLocation?: any;
  owner: OwnerInfo;
  manager?: ManagerInfo;
  financialManager?: FinancialManagerInfo;
  delivery?: DeliveryInfo;
  selectedPlan: string;
  selectedAddons: string[];
  totalScreens: number;
  planQuantity: number;
  additionalScreens?: number;
  additionalScreenUnitCost?: number;
  planPrice?: number;
  addonsWithPrices?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  contractType?: string;
  includeLegalPackage?: boolean;
  staffUserId?: string;
  staffEmail?: string;
  decoderRental: boolean;
  customItemName: string;
  customItemPrice: number;
  autrePoncText?: string;
  autrePoncCost?: number;
  connectionFeeEnabled?: boolean;
  connectionFeeCost?: number;
  installFeeEnabled?: boolean;
  installFeeCost?: number;
  decoderHardwareEnabled?: boolean;
  decoderHardwareCost?: number;
  satelliteDishEnabled?: boolean;
  satelliteDishCost?: number;
  otherHardwareEnabled?: boolean;
  otherHardwareName?: string;
  otherHardwareCost?: number;
  otherHardware2Enabled?: boolean;
  otherHardware2Name?: string;
  otherHardware2Cost?: number;
  additionalScreensComment?: string;
  addSepaMandate?: boolean;
  addCcAuthorization?: boolean;
  selectedDecoders?: any[];
  selectedFees?: any[];
  sepaData?: {
    firstName: string;
    lastName: string;
    companyName: string;
    address: string;
    postalCode: string;
    city: string;
    country: string;
    iban: string;
    bic: string;
    paymentRecurrent: boolean;
    paymentPonctuel: boolean;
    rum: string;
    contractReference: string;
  };
  approverName?: string;
  approverEmail?: string;
  // 🚀 ADD THESE 3 LINES 🚀
  selectedFlexChannels?: number[];
  extraFlexCost?: number;
  extraFlexEnabled?: boolean;
  taxDesc?: string;
  taxAmount?: number;
  currency?: string;
  nickname?: string;
}

const Kiosk = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation("pdfIntegration");
  const { isStaff, isAdmin } = useUserRole();
  const { staffUserId, staffEmail } = useStaffUser();
  const isStaffUser = isStaff || isAdmin;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [iframeUrl, setIframeUrl] = useState<string>("");
  const [isSigned, setIsSigned] = useState(false);
  const [currentDocumentId, setCurrentDocumentId] = useState<string>("");
  const documentIdRef = useRef("");
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateStatus, setDuplicateStatus] = useState("");
  const [pendingKioskPayload, setPendingKioskPayload] = useState<any>(null);
  const subscriptionData = location.state as SubscriptionData;

  const [recipientEmail, setRecipientEmail] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleForceKioskProceed = async () => {
    setIsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

      const draftResponse = await fetch(
        `${apiUrl}/api/admin/subscriptions/draft`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            ...pendingKioskPayload,
            forceDuplicate: true,
          }),
        }
      );
      // 🚀 NEW SAFEGUARD: Check if the response is actually JSON
      const contentType = draftResponse.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        if (draftResponse.status === 504)
          throw new Error(
            "The document generation timed out. Please try again."
          );
        const rawText = await draftResponse.text();
        console.error("Received non-JSON response:", rawText.substring(0, 150));
        throw new Error(
          "Server configuration error. The backend returned an invalid response."
        );
      }

      const draftData = await draftResponse.json();

      if (!draftResponse.ok || !draftData.success) {
        throw new Error(draftData.error || "Failed to create database record.");
      }

      const generatedSubscriptionId =
        draftData.subscriptionId || draftData.proposalId || draftData.id;

      const finalPayload = {
        ...pendingKioskPayload,
        subscriptionId: generatedSubscriptionId,
      };

      const result = await executeSignNowAction(finalPayload);

      if (result.flowType === "approver_embed") {
        toast({
          title: "Approver Signature Required",
          description: "Please review and sign.",
        });
        setIframeUrl(result.embedUrl);
      } else if (result.flowType === "approver_invite") {
        toast({
          title: "Contract Sent to Approver",
          description: "Check your email.",
        });
        navigate("/");
      } else {
        setIframeUrl(result.embedUrl);
      }
    } catch (err: any) {
      setError(err.message || "Failed to initialize contract");
    } finally {
      setIsLoading(false);
    }
  };

  // Pre-fill email
  useEffect(() => {
    if (subscriptionData?.owner?.email) {
      setRecipientEmail(subscriptionData.owner.email);
    }
  }, [subscriptionData]);

  // Listener for iframe success message
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const isSelf = event.origin === window.location.origin;
      if (!isSelf) return;

      if (event.data?.type === "CONTRACT_SIGNED") {
        console.log("✅ Kiosk: Received completion signal!");
        setIsSigned(true);
        toast({
          title: t("success.title", { defaultValue: "Success" }),
          description: t("bridge.redirecting", {
            defaultValue: "Document signed successfully.",
          }),
        });
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [toast, t]);

  /**
   * ==========================================
   * 🚀 UNIFIED EDGE FUNCTION CALLER (JSON Responses)
   * ==========================================
   */
  const executeSignNowAction = async (payload: any) => {
    try {
      console.log("🚀 Calling SignNow Action:", payload.action || "create");

      const { data, error: functionError } = await supabase.functions.invoke(
        "signnow-contract",
        { body: payload }
      );

      if (functionError) throw functionError;

      if (!data.success) {
        throw new Error(data.error || "Operation failed on server");
      }

      // Document ID capturing
      if (data.documentId) {
        console.log("📍 Captured Document ID:", data.documentId);
        setCurrentDocumentId(data.documentId);
        documentIdRef.current = data.documentId;
      }

      return data;
    } catch (err: any) {
      console.error("❌ SignNow Action Error:", err);
      throw err;
    }
  };

  /**
   * ==========================================
   * INITIALIZATION EFFECT (Now creates DB entry first)
   * ==========================================
   */
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!subscriptionData) {
      navigate("/new-subscription");
      return;
    }
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initializeSignNow = async () => {
      try {
        setIsLoading(true);

        const planPrice =
          subscriptionData.planPrice ??
          getPlanPrice(subscriptionData.selectedPlan);
        const addonsWithPrices =
          subscriptionData.addonsWithPrices ||
          subscriptionData.selectedAddons.map((addonId) => ({
            id: addonId,
            name: addonId,
            quantity: subscriptionData.planQuantity,
            price: getAddonPrice(addonId),
          }));

        // --- 1. PREPARE THE FULL PAYLOAD ---
        const contractData = {
          sendMethod: "kiosk",
          require2FA: false,
          nickname: subscriptionData.nickname,
          originalLocation: subscriptionData.originalLocation,

          // 🚀 FIX: MAP THE TAX & CURRENCY FIELDS SO THEY AREN'T LOST 🚀
          taxDesc: subscriptionData.taxDesc,
          taxAmount: subscriptionData.taxAmount,
          currency: subscriptionData.currency,

          subscriberInfo: subscriptionData.owner,
          partnerInfo: subscriptionData.manager,
          guarantorInfo: subscriptionData.financialManager,
          deliveryInfo: subscriptionData.delivery,
          selectedPlan: {
            id:
              subscriptionData.originalPlan ||
              (typeof subscriptionData.selectedPlan === "object"
                ? (subscriptionData.selectedPlan as any).id
                : ""),
            name:
              typeof subscriptionData.selectedPlan === "object"
                ? (subscriptionData.selectedPlan as any).name
                : subscriptionData.selectedPlan,
            price: planPrice,
          },
          addons: addonsWithPrices.map((addon: any) => ({
            name: addon.name,
            price: addon.price,
            quantity: addon.quantity,
          })),
          location: {
            id: subscriptionData.location,
            address: subscriptionData.location,
            city: subscriptionData.owner.city,
            postalCode: subscriptionData.owner.postalCode,
          },

          planQuantity: subscriptionData.planQuantity,
          additionalScreens: subscriptionData.additionalScreens,
          // 🚀 FIX: ADDED THESE TWO LINES TO PASS THE MATH DOWN 🚀
          totalScreens: subscriptionData.totalScreens,
          additionalScreenUnitCost: subscriptionData.additionalScreenUnitCost,

          includeLegalPackage: subscriptionData.includeLegalPackage ?? true,
          planInfo: {
            contractType: subscriptionData.contractType || "individual",
          },
          customItemName: subscriptionData.customItemName,
          customItemPrice: subscriptionData.customItemPrice,
          autrePoncText: subscriptionData.autrePoncText,
          autrePoncCost: subscriptionData.autrePoncCost,
          decoderRental: subscriptionData.decoderRental,
          decoderRentalComment: subscriptionData.decoderRentalComment,
          planComment: subscriptionData.planComment,
          addonComments: subscriptionData.addonComments,
          connectionFeeEnabled: subscriptionData.connectionFeeEnabled,
          connectionFeeCost: subscriptionData.connectionFeeCost,
          connectionFeeComment: subscriptionData.connectionFeeComment,
          installFeeEnabled: subscriptionData.installFeeEnabled,
          installFeeCost: subscriptionData.installFeeCost,
          installFeeComment: subscriptionData.installFeeComment,
          decoderHardwareEnabled: subscriptionData.decoderHardwareEnabled,
          decoderHardwareCost: subscriptionData.decoderHardwareCost,
          decoderPurchaseComment: subscriptionData.decoderPurchaseComment,
          satelliteDishEnabled: subscriptionData.satelliteDishEnabled,
          satelliteDishCost: subscriptionData.satelliteDishCost,
          satelliteDishComment: subscriptionData.satelliteDishComment,
          otherHardwareEnabled: subscriptionData.otherHardwareEnabled,
          otherHardwareName: subscriptionData.otherHardwareName,
          otherHardwareCost: subscriptionData.otherHardwareCost,
          otherHardware2Enabled: subscriptionData.otherHardware2Enabled,
          otherHardware2Name: subscriptionData.otherHardware2Name,
          otherHardware2Cost: subscriptionData.otherHardware2Cost,
          additionalScreensComment: subscriptionData.additionalScreensComment,
          addSepaMandate: subscriptionData.addSepaMandate,
          sepaData: subscriptionData.sepaData,
          addCcAuthorization: subscriptionData.addCcAuthorization,
          approverName: subscriptionData.approverName,
          approverEmail: subscriptionData.approverEmail,
          senderinfo: {
            name: subscriptionData.approverName,
            email: subscriptionData.approverEmail,
          },
          frontendUrl: window.location.origin,
          selectedDecoders: subscriptionData.selectedDecoders,
          selectedFees: subscriptionData.selectedFees,
          selectedFlexChannels: subscriptionData.selectedFlexChannels,
          extraFlexCost: subscriptionData.extraFlexCost,
          extraFlexEnabled: subscriptionData.extraFlexEnabled,
        };

        // --- 2. CRITICAL FIX: CREATE DATABASE ENTRY FIRST ---
        console.log("💾 Creating database entry for Kiosk mode...");

        // Get user token for secure backend request
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

        // Call your backend to create the contract in the DB
        const draftResponse = await fetch(
          `${apiUrl}/api/admin/subscriptions/draft`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ ...contractData, forceDuplicate: false }),
          }
        );
        // 🚀 CRITICAL FIX: Only block NON-JSON responses (like HTML timeouts)
        const contentType = draftResponse.headers.get("content-type");

        if (!contentType || !contentType.includes("application/json")) {
          if (draftResponse.status === 504) {
            throw new Error(
              "The document generation timed out. The server is taking longer than expected to process the PDF. Please try again."
            );
          }
          const rawText = await draftResponse.text();
          console.error(
            "Server returned non-JSON response:",
            rawText.substring(0, 200)
          );
          throw new Error(
            "Server configuration error. Please ensure the backend is running and reachable."
          );
        }

        // It is JSON, so we can safely parse it
        const draftData = await draftResponse.json();

        // 🚨 NOW CATCH THE DUPLICATE PROPERLY 🚨
        if (draftResponse.status === 409 || draftData.isDuplicate) {
          setDuplicateStatus(draftData.existingStatus || "active");
          setPendingKioskPayload(contractData); // Save the payload for later
          setShowDuplicateModal(true);
          setIsLoading(false);
          return; // Stop flow
        }

        // Catch any other backend validation errors (like Nickname already in use)
        if (!draftResponse.ok || !draftData.success) {
          throw new Error(
            draftData.error || "Failed to create database record."
          );
        }
        // 🚨 CATCH DUPLICATE HERE 🚨
        if (draftResponse.status === 409 || draftData.isDuplicate) {
          setDuplicateStatus(draftData.existingStatus);
          setPendingKioskPayload(contractData); // Save the payload to use in handleForceKioskProceed
          setShowDuplicateModal(true);
          setIsLoading(false);
          return; // Stop flow
        }
        if (!draftData.success) {
          throw new Error(
            draftData.error || "Failed to create database record."
          );
        }

        // Extract the generated ID from your backend response
        const generatedSubscriptionId =
          draftData.subscriptionId || draftData.proposalId || draftData.id;
        console.log("✅ Database record created! ID:", generatedSubscriptionId);

        // --- 3. CALL EDGE FUNCTION WITH THE NEW ID ---
        const finalPayload = {
          ...contractData,
          subscriptionId: generatedSubscriptionId, // <-- The Edge Function uses this to UPDATE the DB record
        };

        const result = await executeSignNowAction(finalPayload);

        // Flow Routing
        if (result.flowType === "approver_embed") {
          toast({
            title: "Approver Signature Required",
            description: "Please review and sign.",
          });
          setIframeUrl(result.embedUrl);
        } else if (result.flowType === "approver_invite") {
          toast({
            title: "Contract Sent to Approver",
            description: "Check your email.",
          });
          navigate("/");
          return;
        } else {
          setIframeUrl(result.embedUrl);
        }
      } catch (err: any) {
        setError(err.message || "Failed to initialize contract");
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeSignNow();
  }, [subscriptionData, navigate, toast]);

  /**
   * ==========================================
   * 📥 DOWNLOAD HANDLER (NATIVE FETCH TO BYPASS SUPABASE JS COMPRESSION)
   * ==========================================
   */
  const handleManualDownload = async () => {
    const docId = documentIdRef.current || currentDocumentId;

    if (!docId) {
      toast({
        title: "Error",
        description: "Document ID missing. Please refresh.",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);
    try {
      // 1. Get credentials directly from the client instance
      const supabaseUrl =
        (supabase as any).supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey =
        (supabase as any).supabaseKey || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token || supabaseKey;

      // 2. Native fetch call. This stops Supabase from parsing the PDF into a text string
      const response = await fetch(
        `${supabaseUrl}/functions/v1/signnow-contract`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: "download", documentId: docId }),
        }
      );

      // 3. Handle specific JSON errors thrown by Edge Function
      if (!response.ok) {
        let errMsg = "Failed to fetch document from server.";
        try {
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch (e) {}
        throw new Error(errMsg);
      }

      // 4. Safely extract the raw binary Blob
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      const fileName = `Signed_Contract_${subscriptionData.owner.lastName}.pdf`;
      link.setAttribute("download", fileName);

      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      toast({ title: "Success", description: "Contract PDF downloaded." });
    } catch (err: any) {
      console.error("Manual Download Error:", err);
      toast({
        title: "Download Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    const docId = documentIdRef.current || currentDocumentId;

    if (!docId || !recipientEmail) {
      toast({
        title: "Error",
        description: "Missing email or Document ID.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(true);
    try {
      const recipients = [recipientEmail];
      if (staffEmail && staffEmail !== recipientEmail) {
        recipients.push(staffEmail);
      }

      await executeSignNowAction({
        action: "email_copy",
        documentId: docId,
        emails: recipients,
      });
      toast({
        title: "Email Sent",
        description: `Copy sent to ${recipientEmail}`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to send email.",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  /**
   * ==========================================
   * RENDER STATES
   * ==========================================
   */
  if (!subscriptionData) return null;

  if (isSigned) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
        <div className="max-w-lg w-full bg-white dark:bg-card p-8 rounded-xl shadow-lg border border-border space-y-8">
          <div className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Signature Done!
            </h1>
            <p className="text-muted-foreground">
              The contract has been finalized. Would you like a copy?
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={handleManualDownload}
              variant="outline"
              className="w-full h-12 text-lg font-medium border-primary text-primary hover:!bg-primary hover:!text-primary-foreground transition-all duration-200"
              disabled={isDownloading}
            >
              <Download className="mr-2 h-5 w-5" />
              {isDownloading ? "Preparing PDF..." : "Download PDF Now"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  OR Email Copy
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="space-y-1">
                <Label htmlFor="recipient">Recipient Email</Label>
                <Input
                  id="recipient"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="h-11"
                />
              </div>
              <Button
                onClick={handleSendEmail}
                className="w-full h-12 text-lg btn-professional"
                disabled={isSendingEmail}
              >
                <Mail className="mr-2 h-5 w-5" />
                {isSendingEmail ? "Sending..." : "Send Email Copy"}
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <Button
              onClick={() => navigate("/", { replace: true })}
              variant="ghost"
              size="lg"
              className="w-full text-muted-foreground hover:text-foreground"
            >
              <Home className="mr-2 h-5 w-5" /> Return to Home Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center">
        <Loader2 className="animate-spin h-16 w-16 text-primary mb-6" />
        <h2 className="text-xl font-semibold text-foreground">
          {t("loading.title", { defaultValue: "Loading..." })}
        </h2>
        <p className="text-muted-foreground mt-2">
          Preparing your document securely.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-8">
        <div className="max-w-md text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-destructive">
            Unable to Load Contract
          </h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => navigate(-1)} variant="outline" size="lg">
            <ArrowLeft className="h-5 w-5 mr-2" /> Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
      <div className="flex-none h-14 bg-white/90 backdrop-blur-sm border-b px-4 flex items-center justify-between absolute top-0 left-0 right-0 z-10">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-white/50 backdrop-blur-md">
            Kiosk Mode
          </Badge>
          <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block">
            {subscriptionData.owner.firstName} {subscriptionData.owner.lastName}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Exit Kiosk
        </Button>
      </div>

      <div className="flex-1 w-full h-full pt-14 bg-gray-50">
        {iframeUrl ? (
          <iframe
            key="signnow-kiosk-fix"
            src={iframeUrl}
            className="w-full h-full border-0 block"
            title="SignNow Contract Signature"
            allow="clipboard-write; payment"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">
              Initializing document viewer...
            </p>
          </div>
        )}
      </div>
      {/* DUPLICATE WARNING MODAL */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-card border border-amber-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-amber-500">
              <AlertCircle size={28} />
              <h2 className="text-xl font-black uppercase tracking-tight">
                Duplicate Detected
              </h2>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              An exact duplicate of this contract already exists for this
              customer. The existing contract is currently marked as{" "}
              <span className="font-bold text-foreground uppercase px-2 py-0.5 bg-muted rounded">
                {duplicateStatus}
              </span>
              .
            </p>
            <p className="text-muted-foreground text-xs mb-6 italic">
              Are you sure you want to generate another identical document?
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDuplicateModal(false);
                  navigate(-1); // Go back if they cancel
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowDuplicateModal(false);
                  handleForceKioskProceed(); // Fire the manual trigger
                }}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
              >
                Yes, Proceed
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Kiosk;
