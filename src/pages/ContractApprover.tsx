import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/ui/navigation";
import { ArrowLeft, ExternalLink, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

interface SubscriptionData {
  location: string;
  owner: any;
  manager?: any;
  financialManager?: any;
  delivery?: any;
  selectedPlan: string;
  selectedAddons: any[];
  totalScreens: number;
  planQuantity: number;
  additionalScreens?: number;
  planPrice?: number;
  addonsWithPrices?: Array<{ id: string; name: string; price: number; quantity?: number }>;
  contractType?: string;
  includeLegalPackage?: boolean;
  decoderRental: boolean;
  customItemName: string;
  customItemPrice: number;
  useApproverFlow?: boolean;
  approverName?: string;
  approverEmail?: string;
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
  selectedDecoders?: any[];
  selectedFees?: any[]; // <--- 🚀 ADD THIS LINE
  selectedFlexChannels?: number[];
  extraFlexCost?: number;
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
}

const ContractApprover = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('pdfIntegration');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [iframeUrl, setIframeUrl] = useState<string>("");
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);

  const subscriptionData = location.state as SubscriptionData;

  useEffect(() => {
    if (!subscriptionData) {
      toast({
        title: "No subscription data",
        description: "Please start from the subscription form",
        variant: "destructive",
      });
      navigate("/new-subscription");
      return;
    }

    const initializeApproverFlow = async () => {
      try {
        setIsLoading(true);

        const contractData = {
          subscriberInfo: subscriptionData.owner,
          partnerInfo: subscriptionData.manager,
          guarantorInfo: subscriptionData.financialManager,
          deliveryInfo: subscriptionData.delivery,
          selectedPlan: { 
            name: subscriptionData.selectedPlan, 
            price: subscriptionData.planPrice || 0 
          },
          addons: subscriptionData.addonsWithPrices?.map((addon) => ({ 
            name: addon.name, 
            price: addon.price,
            quantity: addon.quantity || 1
          })) || [],
          location: {
            id: subscriptionData.location,
            address: subscriptionData.location,
            city: subscriptionData.owner.city,
            postalCode: subscriptionData.owner.postalCode,
          },
          additionalScreens: subscriptionData.additionalScreens || 0,
          planQuantity: subscriptionData.planQuantity || 1,
          includeLegalPackage: subscriptionData.includeLegalPackage ?? true,
          planInfo: { contractType: subscriptionData.contractType || "individual" },
          customItemName: subscriptionData.customItemName,
          customItemPrice: subscriptionData.customItemPrice,
          decoderRental: subscriptionData.decoderRental,
          decoderRentalComment: subscriptionData.decoderRentalComment,
          planComment: subscriptionData.planComment,
          addonComments: subscriptionData.addonComments,
          connectionFeeComment: subscriptionData.connectionFeeComment,
          installFeeComment: subscriptionData.installFeeComment,
          decoderPurchaseComment: subscriptionData.decoderPurchaseComment,
          satelliteDishComment: subscriptionData.satelliteDishComment,
          otherHardware2Enabled: subscriptionData.otherHardware2Enabled,
          otherHardware2Name: subscriptionData.otherHardware2Name,
          otherHardware2Cost: subscriptionData.otherHardware2Cost,
          additionalScreensComment: subscriptionData.additionalScreensComment,
          addSepaMandate: subscriptionData.addSepaMandate,
          sepaData: subscriptionData.sepaData,
          frontendUrl: window.location.origin,
          useApproverFlow: true,
          approverName: subscriptionData.approverName,
          approverEmail: subscriptionData.approverEmail,
          selectedDecoders: subscriptionData.selectedDecoders,
          selectedFees: subscriptionData.selectedFees,
          selectedFlexChannels: subscriptionData.selectedFlexChannels,
          extraFlexCost: subscriptionData.extraFlexCost,
        };

        const { data, error: functionError } = await supabase.functions.invoke("signnow-essentials", {
          body: contractData,
        });

        if (functionError) {
          throw functionError;
        }

        if (!data.success) {
          throw new Error(data.error || "Failed to create contract");
        }

        toast({
          title: "Approver Signature Required",
          description: `${data.approverName}, please review and sign the contract below. After you sign, it will automatically be sent to ${data.signerName} for their signature.`,
        });

        setIframeUrl(data.embedUrl);
        setIsLoading(false);
        setError("");
      } catch (err: any) {
        console.error("Approver flow error:", err);
        setError("Failed to initialize approver flow");
        toast({
          title: "Error",
          description: err.message || "Failed to initialize approver flow",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    };

    initializeApproverFlow();
  }, [subscriptionData, navigate, toast]);

  const handleCompletedSignature = () => {
    setShowCompletionDialog(true);
  };

  const handleConfirmCompletion = () => {
    navigate("/");
  };

  const handleReturnToDashboard = () => {
    toast({
      title: "Processing",
      description: "Contract is being processed",
    });
    navigate("/");
  };

  const handleOpenInNewTab = () => {
    if (iframeUrl) {
      window.open(iframeUrl, "_blank");
    }
  };

  if (!subscriptionData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Approver Signature</h1>
          <p className="text-muted-foreground">Please review and sign the contract to send it to the customer</p>
        </div>

        {isLoading && (
          <Card className="card-professional">
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold text-foreground">Preparing Contract</h3>
                <p className="text-muted-foreground">Please wait while we set up the signing interface...</p>
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
              <AlertDescription>
                Contract ready for your signature. After signing, it will be sent to the customer.
              </AlertDescription>
            </Alert>

            <div className="flex space-x-4 mb-6">
              <Button onClick={handleOpenInNewTab} variant="outline">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
              <Button onClick={handleCompletedSignature} className="btn-professional">
                <CheckCircle className="h-4 w-4 mr-2" />
                I've Completed My Signature
              </Button>
            </div>

            <Card className="card-professional">
              <CardHeader>
                <CardTitle>Signature Interface</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Sign the contract below to send it to the customer
                </p>
              </CardHeader>
              <CardContent>
                <div className="border border-border rounded-lg overflow-hidden bg-white">
                  {iframeUrl ? (
                    <iframe
                      src={iframeUrl}
                      width="100%"
                      height="600"
                      className="border-0"
                      title="SignNow Contract Signature"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-96 bg-muted/30">
                      <div className="text-center">
                        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Unable to load signing interface</p>
                        <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
                          Reload Page
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="card-professional">
              <CardHeader>
                <CardTitle>Contract Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <h4 className="font-semibold text-foreground">Customer</h4>
                    <p className="text-muted-foreground">
                      {subscriptionData.owner.firstName} {subscriptionData.owner.lastName}
                    </p>
                    <p className="text-muted-foreground">{subscriptionData.owner.email}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Location</h4>
                    <p className="text-muted-foreground">{subscriptionData.location}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Plan</h4>
                    <p className="text-muted-foreground">{subscriptionData.selectedPlan}</p>
                    <p className="text-muted-foreground">
                      {subscriptionData.selectedAddons.length > 0 && `+ ${subscriptionData.selectedAddons.map(a => a.id).join(", ")}`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <AlertDialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Signature Complete</AlertDialogTitle>
              <AlertDialogDescription>
                The contract has been signed successfully. The signer ({subscriptionData?.owner.firstName} {subscriptionData?.owner.lastName}) will receive an email shortly with instructions to complete their signature.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={handleConfirmCompletion}>
                OK
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default ContractApprover;
