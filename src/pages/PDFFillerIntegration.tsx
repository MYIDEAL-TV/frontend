import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/ui/navigation";
import {
  ArrowLeft,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Bug,
  FileDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { useUserRole } from "@/hooks/useUserRole";
import { useStaffUser } from "@/hooks/useStaffUser";
import { ApiDebugDialog } from "@/components/ApiDebugDialog";

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
  nickname: any;
  additionalScreenUnitCost: any;
  extraFlexEnabled: any;
  extraFlexCost: any;
  selectedFlexChannels: any;
  originalLocation: any;
  taxDesc: string;
  taxAmount: number;
  currency: string;
  subscriptionId: any;
  location: string;
  owner: OwnerInfo;
  manager?: ManagerInfo;
  financialManager?: FinancialManagerInfo;
  delivery?: DeliveryInfo;
  selectedPlan: string;
  selectedAddons: string[];
  totalScreens: number;
  planQuantity: number;
  additionalScreens?: number;
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
  decoderRentalComment?: string;
  decoderPurchaseComment?: string;
  planComment?: string;
  addonComments?: Record<string, string>;
  satelliteDishComment?: string;
  otherHardware2Enabled?: boolean;
  otherHardware2Name?: string;
  otherHardware2Cost?: number;
  connectionFeeComment?: string;
  installFeeComment?: string;
  additionalScreensComment?: string;
  addSepaMandate?: boolean;
  addCcAuthorization?: boolean;
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
  selectedDecoders?: any[];
  selectedFees?: any[];
}

const PDFFillerIntegration = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation("pdfIntegration");
  const { isStaff, isAdmin } = useUserRole();
  const { staffUserId } = useStaffUser();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [showDebugDialog, setShowDebugDialog] = useState(false);
  const [debugData, setDebugData] = useState<{
    subscriptionData: any;
    contractData: any;
  } | null>(null);

  // Debug mode state
  const [debugModeEnabled, setDebugModeEnabled] = useState(false);
  const [debugEndpoint, setDebugEndpoint] = useState("assignBrandToDocument");
  const [debugAttributePath, setDebugAttributePath] = useState("email.from");
  const [debugNewValue, setDebugNewValue] = useState("");
  const [apiDebugResult, setApiDebugResult] = useState<any>(null);
  const [showApiDebugDialog, setShowApiDebugDialog] = useState(false);

  // State for Flow Control
  const [documentId, setDocumentId] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false); // NEW: Track if we are in review mode vs signing mode
  const [showDownloadOption, setShowDownloadOption] = useState(false); // NEW: Track if preview was closed
  const [isDownloading, setIsDownloading] = useState(false); // NEW: Track if we are in the process of downloading
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateStatus, setDuplicateStatus] = useState("");
  const subscriptionData = location.state as SubscriptionData;

  const isStaffUser = isStaff || isAdmin;

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only respond to our specific static file's signal
      if (event.data?.type === "SIGNNOW_CLOSE_VIEW") {
        console.log("📥 Close signal received. Terminating iframe session.");

        // 1. Physically remove the iframe from the DOM by clearing the URL
        setIframeUrl(null);

        // 2. Switch to the Download UI
        setShowDownloadOption(true);

        // 3. Clear review mode to hide the green/red buttons
        setIsReviewMode(false);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []); // Empty dependency array ensures this is added only once

  useEffect(() => {
    if (!subscriptionData) {
      toast({
        title: t("error.noData.title"),
        description: t("error.noData.description"),
        variant: "destructive",
      });
      navigate("/new-subscription");
      return;
    }

    const initializeSignNow = async () => {
      try {
        setIsLoading(true);

        // We completely trust the DB prices passed from NewSubscription.tsx
        const planPrice = subscriptionData.planPrice || 0;
        const addonsWithPrices = subscriptionData.addonsWithPrices || [];

        const contractData = {
          // CRITICAL: This must be "email" for the remote flow
          sendMethod: "email",

          // 🚀 FIX: Added missing Nickname
          nickname: subscriptionData.nickname,
          originalLocation: subscriptionData.originalLocation,

          subscriberInfo: {
            ...subscriptionData.owner,
            // Ensure phone is passed for 2FA
            cellPhone: subscriptionData.owner.cellPhone,
          },
          partnerInfo: subscriptionData.manager,
          guarantorInfo: subscriptionData.financialManager,
          deliveryInfo: subscriptionData.delivery,
          selectedPlan: {
            name: subscriptionData.selectedPlan,
            price: planPrice,
          },
          addons: addonsWithPrices.map((addon) => ({
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
          currency: subscriptionData.currency || "EUR",
          taxAmount: subscriptionData.taxAmount || 0, // CRITICAL: Fixes the 0% tax bug
          taxDesc: subscriptionData.taxDesc || "None",

          totalScreens: subscriptionData.totalScreens,
          planQuantity: subscriptionData.planQuantity,
          additionalScreens: subscriptionData.additionalScreens,

          // 🚀 FIX: Added dynamic screen cost to fix math
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

          // 🚀 FIX: Added missing Flex Channel data for the email flow
          selectedFlexChannels: subscriptionData.selectedFlexChannels,
          extraFlexCost: subscriptionData.extraFlexCost,
          extraFlexEnabled: subscriptionData.extraFlexEnabled,

          // Add debug configuration if enabled
          ...(debugModeEnabled &&
            isStaffUser &&
            staffUserId && {
              debugConfig: {
                enabled: true,
                endpoint: debugEndpoint,
                attributePath: debugAttributePath,
                newValue: debugNewValue,
                staffUserId: staffUserId,
              },
            }),
        };

        // Store debug data and show dialog
        setDebugData({
          subscriptionData: subscriptionData,
          contractData: contractData,
        });
        setShowDebugDialog(true);

        // Directly call edge function
        await callEdgeFunction(contractData);
      } catch (err: any) {
        console.error("SignNow integration error:", err);
        setError(t("error.failed"));
        toast({
          title: t("error.integration.title"),
          description: err.message || t("error.integration.description"),
          variant: "destructive",
        });
        setIsLoading(false);
      }
    };

    const callEdgeFunction = async (contractData: any) => {
      try {
        console.log(
          "📝 Contract Data before calling edge function:",
          JSON.stringify(contractData, null, 2)
        );
        const { data, error: functionError } = await supabase.functions.invoke(
          "signnow-contract",
          {
            body: contractData,
          }
        );

        if (functionError) {
          throw functionError;
        }

        if (!data.success) {
          throw new Error(data.error || "Failed to create contract");
        }
        if (data.documentId) {
          setDocumentId(data.documentId);
        }

        // Handle debug data if present
        if (data.debugData) {
          setApiDebugResult(data.debugData);
          setShowApiDebugDialog(true);
        }

        // CASE 1: Sender Review (This triggers the Green Button UI)
        if (data.flowType === "sender_review") {
          toast({
            title: "Document Ready for Review",
            description:
              "Review the document below. When ready, click 'Finalize & Send' above the document.",
          });
          setIframeUrl(data.embedUrl);
          setIsReviewMode(true); // ENABLE Review Mode
          setIsLoading(false);
          return;
        }

        // CASE 2: Approver Signing (Embedded) - NO Green Button
        if (data.flowType === "approver_embed") {
          toast({
            title: "Approver Signature Required",
            description: `${data.approverName}, please review and sign the contract below.`,
          });

          setIframeUrl(data.embedUrl);
          setIsReviewMode(false); // DISABLE Review Mode
          setIsLoading(false);
          setError("");
          return;
        }

        // CASE 3: Approver Invite (Email) - Redirect
        else if (data.flowType === "approver_invite") {
          toast({
            title: "Contract Sent to Approver",
            description: `The contract has been sent to ${data.approverName}.`,
          });
          navigate("/");
          return;
        }

        // CASE 4: Standard/Other Flows
        else {
          toast({
            title: t("success.title"),
            description: t("success.description"),
          });
          setIsReviewMode(false);
        }

        setIframeUrl(data.embedUrl);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSignNow();
  }, [subscriptionData, navigate, toast]);

  const handleReturnToDashboard = () => {
    toast({
      title: t("processing.title"),
      description: t("processing.description"),
    });
    navigate("/");
  };

  const handleOpenInNewTab = () => {
    if (iframeUrl) {
      window.open(iframeUrl, "_blank");
    }
  };

  const handleDownloadDraft = async () => {
    if (!documentId || isDownloading) return;

    try {
      setIsDownloading(true);
      toast({
        title: "Generating PDF",
        description: "Fetching the document draft...",
      });

      // IMPORTANT: Get the session for authentication
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      // Use standard fetch to ensure we get a clean 'blob' response
      const response = await fetch(
        `${supabaseUrl}/functions/v1/signnow-contract`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            action: "download",
            documentId: documentId,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to download PDF");

      // Convert the response specifically to a BLOB
      const blob = await response.blob();

      // Trigger the browser download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Contract_Draft_${subscriptionData.owner.lastName}.pdf`
      );
      document.body.appendChild(link);
      link.click();

      // Cleanup
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({ title: "Success", description: "Draft PDF downloaded." });
    } catch (err: any) {
      console.error("Download error:", err);
      toast({
        title: "Download Failed",
        description:
          "The file was corrupted or unavailable. You can still send the invite.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (!subscriptionData) {
    return null;
  }

  const handleFinalizeAndSend = async (forceDuplicate = false) => {
    if (!documentId) return;

    try {
      setIsSending(true);

      // We need to send the full cart data PLUS the documentId and action
      // to our new Node.js backend route.
      const payload = {
        ...subscriptionData, // Make sure this contains the selectedPlan, hardware, etc.
        action: "send_invite",
        documentId: documentId,
        approverName: subscriptionData.approverName,
        approverEmail: subscriptionData.approverEmail,
        subscriberInfo: subscriptionData.owner,
        forceDuplicate: forceDuplicate,
      };
      const token = (await supabase.auth.getSession()).data.session
        ?.access_token;
      // REROUTE: Call the Node.js backend instead of the Edge Function directly
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/subscriptions/draft`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Add your auth token here if your Node backend requires it
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      // 🚨 CATCH DUPLICATE HERE 🚨
      if (response.status === 409 || data.isDuplicate) {
        setDuplicateStatus(data.existingStatus);
        setShowDuplicateModal(true);
        setIsSending(false);
        return; // Stop the flow
      }
      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to save the subscription to the database."
        );
      }

      toast({
        title: t("success.title"),
        description:
          "Contract saved securely and sent to customer with 2FA enabled.",
      });

      navigate("/");
    } catch (err: any) {
      console.error("Invite Error Details:", err);
      toast({
        title: "Send Failed",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // 2. NEW: Abort and Return to Edit function
  const handleAbortAndEdit = () => {
    toast({
      title: "Process Aborted",
      description:
        "Returning to subscription form. You can now correct the information.",
    });

    // Navigate back to the form and pass the current state so it repopulates
    navigate("/new-subscription", {
      state: { usr: subscriptionData }, // NewSubscription.tsx checks for this
      replace: true,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("backButton")}
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>

        {isLoading && (
          <Card className="card-professional">
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold text-foreground">
                  {t("loading.title")}
                </h3>
                <p className="text-muted-foreground">
                  {t("loading.description")}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && (
          <div className="space-y-6">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{t("success.alert")}</AlertDescription>
            </Alert>

            <div className="flex space-x-4 mb-6">
              {iframeUrl && (
                <Button onClick={handleOpenInNewTab} variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t("buttons.openNewTab")}
                </Button>
              )}
              <Button
                onClick={handleReturnToDashboard}
                className="btn-professional"
              >
                {t("buttons.returnDashboard")}
              </Button>
            </div>

            {/* IFRAME / REVIEW CLOSED Section */}
            {!isLoading && (iframeUrl || showDownloadOption) && (
              <div className="space-y-6">
                {
                  <div className="bg-primary/5 border border-primary/20 p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Step 2: Final Verification
                      </h3>
                      <p className="text-muted-foreground">
                        Review the document below. If you find an error (e.g.
                        wrong phone or price), click{" "}
                        <strong>Abort & Edit</strong>.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                      <Button
                        variant="destructive"
                        onClick={handleAbortAndEdit}
                        disabled={isSending}
                        className="font-semibold shadow-md"
                      >
                        <AlertCircle className="mr-2 h-4 w-4" />
                        ABORT & EDIT
                      </Button>

                      <Button
                        onClick={() => handleFinalizeAndSend(false)}
                        disabled={isSending}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold shadow-md"
                      >
                        {isSending ? (
                          <>Sending Invite...</>
                        ) : (
                          <>FINALIZE & SEND (with 2FA)</>
                        )}
                      </Button>
                    </div>
                  </div>
                }

                {/* The Iframe or Download UI Card */}
                <Card className="card-professional">
                  <CardContent className="p-0">
                    <div className="border border-border rounded-lg overflow-hidden bg-white flex flex-col items-center justify-center min-h-[600px]">
                      {iframeUrl ? (
                        <iframe
                          // CRITICAL: Forces React to destroy the old iframe and all its 401/error states
                          key={`${documentId}-${
                            showDownloadOption ? "closed" : "open"
                          }`}
                          src={iframeUrl || ""}
                          className="border-0 w-full h-[85vh]"
                          title="SignNow Preview"
                          // UPDATED: Added allow-top-navigation to solve the "Ancestors" error in your logs
                          // sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-top-navigation allow-top-navigation-by-user-activation"
                        />
                      ) : showDownloadOption ? (
                        <div className="text-center p-12 animate-in fade-in zoom-in duration-300">
                          <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FileDown className="h-10 w-10 text-primary" />
                          </div>
                          <h3 className="text-2xl font-bold mb-2">
                            Review Closed
                          </h3>
                          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                            The document preview has been closed. You can
                            proceed to send the official invite using the green
                            button above, or download a draft copy.
                          </p>
                          <Button
                            onClick={handleDownloadDraft}
                            variant="outline"
                            className="px-8 py-6 h-auto text-lg font-semibold shadow-sm"
                          >
                            DOWNLOAD DRAFT PDF
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Summary Card */}
            <Card className="card-professional">
              <CardHeader>
                <CardTitle>{t("summary.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <h4 className="font-semibold text-foreground">
                      {t("summary.customer")}
                    </h4>
                    <p className="text-muted-foreground">
                      {subscriptionData.owner.firstName}{" "}
                      {subscriptionData.owner.lastName}
                    </p>
                    <p className="text-muted-foreground">
                      {subscriptionData.owner.email}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">
                      {t("summary.location")}
                    </h4>
                    <p className="text-muted-foreground">
                      {subscriptionData.location}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">
                      {t("summary.plan")}
                    </h4>
                    <p className="text-muted-foreground">
                      {subscriptionData.selectedPlan}
                    </p>
                    <p className="text-muted-foreground">
                      {subscriptionData.selectedAddons.length > 0 &&
                        `+ ${subscriptionData.selectedAddons.join(", ")}`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
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
                onClick={() => setShowDuplicateModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowDuplicateModal(false);
                  handleFinalizeAndSend(true); // Re-fire with forceDuplicate = true
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

export default PDFFillerIntegration;
