import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Mail, Smartphone, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getLocationConfig } from "@/config/locationConfig";
import { getPlanPrice, getAddonPrice } from "@/config/pricingConfig";
import { createInitialSubscription, recordContractSubmission } from "@/lib/subscriptionService";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
interface SubscriptionData {
  location: string;
  owner: any;
  manager: any;
  financialManager: any;
  delivery: any;
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
    quantity?: number;
  }>;
  contractType: string;
  sendMethod: 'email' | 'sms';
  authenticationMethod: 'password' | 'sms';
  includeLegalPackage?: boolean;
  decoderRental?: boolean;
  customItemName?: string;
  customItemPrice?: number;
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
  sepaData?: {
    firstName: string;
    lastName: string;
    companyName: string;
    address: string;
    iban: string;
    bic: string;
    paymentRecurrent: boolean;
    paymentPonctuel: boolean;
    rum: string;
    contractReference: string;
  };
}
const ContractSecure = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const subscriptionData = location.state as SubscriptionData;
  const {
    user
  } = useAuth();
  const {
    t
  } = useTranslation('contractSecure');
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [signingLink, setSigningLink] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  useEffect(() => {
    if (!subscriptionData) {
      navigate("/new-subscription");
      return;
    }
    sendSecureInvitation();
  }, []);
  const sendSecureInvitation = async () => {
    setLoading(true);
    setError(null);
    try {
      // Step 1: Get staff_user_id from staff_profiles
      const {
        data: staffProfile,
        error: staffError
      } = await supabase.from('staff_profiles').select('staff_user_id').eq('id', user?.id).maybeSingle();
      if (staffError || !staffProfile?.staff_user_id) {
        throw new Error(t('error.staffProfile'));
      }

      // Step 2: Create subscription in database
      const locationConfig = getLocationConfig(subscriptionData.location);

      // Calculate pricing values
      const additionalScreens = subscriptionData.additionalScreens ?? Math.max(0, subscriptionData.totalScreens - subscriptionData.planQuantity);
      const planPrice = subscriptionData.planPrice ?? getPlanPrice(subscriptionData.selectedPlan);
      const currency = locationConfig?.currency || 'EUR';

      // Map addons with prices - handle both object and string formats
      const addonsWithPrices = subscriptionData.addonsWithPrices || subscriptionData.selectedAddons.map((addon: any) => {
        const addonId = typeof addon === 'string' ? addon : addon.id;
        const addonQty = typeof addon === 'string' ? 1 : addon.quantity || 1;
        return {
          id: addonId,
          name: addonId,
          price: getAddonPrice(addonId),
          quantity: addonQty
        };
      });
      console.log('ContractSecure - Data received:', {
        planQuantity: subscriptionData.planQuantity,
        totalScreens: subscriptionData.totalScreens,
        additionalScreens: subscriptionData.additionalScreens,
        selectedPlan: subscriptionData.selectedPlan,
        addonsWithPrices: addonsWithPrices.map(a => ({
          id: a.id,
          qty: a.quantity
        }))
      });
      const {
        subscriptionId: newSubId,
        error: subError
      } = await createInitialSubscription({
        location: subscriptionData.location,
        subscriber: {
          firstName: subscriptionData.owner.firstName,
          lastName: subscriptionData.owner.lastName,
          email: subscriptionData.owner.email,
          cellPhone: subscriptionData.owner.cellPhone,
          landlinePhone: subscriptionData.owner.landlinePhone,
          companyName: subscriptionData.owner.companyName,
          accommodationName: subscriptionData.owner.accommodationName,
          address: subscriptionData.owner.address,
          city: subscriptionData.owner.city,
          postalCode: subscriptionData.owner.postalCode,
          country: subscriptionData.owner.country,
          acceptsMarketing: subscriptionData.owner.acceptsMarketing
        },
        planId: subscriptionData.selectedPlan,
        planPrice: planPrice,
        currency: currency,
        addons: addonsWithPrices,
        additionalScreens: additionalScreens,
        durationMonths: 12,
        staffUserId: staffProfile.staff_user_id,
        staffEmail: user?.email || '',
        manager: subscriptionData.manager.firstName ? {
          firstName: subscriptionData.manager.firstName,
          lastName: subscriptionData.manager.lastName,
          email: subscriptionData.manager.email,
          cellPhone: subscriptionData.manager.cellPhone,
          companyName: subscriptionData.manager.companyName,
          address: subscriptionData.manager.address,
          city: subscriptionData.manager.city,
          postalCode: subscriptionData.manager.postalCode
        } : undefined,
        financialManager: subscriptionData.financialManager.firstName ? {
          firstName: subscriptionData.financialManager.firstName,
          lastName: subscriptionData.financialManager.lastName,
          email: subscriptionData.financialManager.email,
          cellPhone: subscriptionData.financialManager.cellPhone,
          landlinePhone: subscriptionData.financialManager.landlinePhone
        } : undefined,
        delivery: subscriptionData.delivery.address ? {
          address: subscriptionData.delivery.address,
          city: subscriptionData.delivery.city,
          postalCode: subscriptionData.delivery.postalCode,
          cellPhone: subscriptionData.delivery.cellPhone
        } : undefined,
        contractType: subscriptionData.contractType as 'in_person' | 'remote',
        decoderRental: subscriptionData.decoderRental || false,
        customItemName: subscriptionData.customItemName,
        customItemPrice: subscriptionData.customItemPrice
      });
      if (subError) throw new Error(subError);
      setSubscriptionId(newSubId);

      // Step 2: Send contract via edge function with subscriptionId
      console.log("=== CONTRACT SECURE DEBUG ===");
      console.log("subscriptionData.addSepaMandate:", subscriptionData.addSepaMandate);
      console.log("subscriptionData.sepaData:", subscriptionData.sepaData);
      console.log("============================");
      
      const contractData = {
        subscriptionId: newSubId,
        subscriberInfo: {
          firstName: subscriptionData.owner.firstName,
          lastName: subscriptionData.owner.lastName,
          email: subscriptionData.owner.email,
          cellPhone: subscriptionData.owner.cellPhone,
          landlinePhone: subscriptionData.owner.landlinePhone,
          companyName: subscriptionData.owner.companyName,
          accommodationName: subscriptionData.owner.accommodationName,
          address: subscriptionData.owner.address,
          city: subscriptionData.owner.city,
          postalCode: subscriptionData.owner.postalCode,
          country: subscriptionData.owner.country,
          acceptsMarketing: subscriptionData.owner.acceptsMarketing
        },
        partnerInfo: subscriptionData.manager.firstName ? {
          firstName: subscriptionData.manager.firstName,
          lastName: subscriptionData.manager.lastName,
          email: subscriptionData.manager.email,
          cellPhone: subscriptionData.manager.cellPhone,
          companyName: subscriptionData.manager.companyName,
          address: subscriptionData.manager.address,
          city: subscriptionData.manager.city,
          postalCode: subscriptionData.manager.postalCode
        } : undefined,
        guarantorInfo: subscriptionData.financialManager.firstName ? {
          firstName: subscriptionData.financialManager.firstName,
          lastName: subscriptionData.financialManager.lastName,
          email: subscriptionData.financialManager.email,
          cellPhone: subscriptionData.financialManager.cellPhone,
          landlinePhone: subscriptionData.financialManager.landlinePhone
        } : undefined,
        deliveryInfo: subscriptionData.delivery.address ? {
          address: subscriptionData.delivery.address,
          city: subscriptionData.delivery.city,
          postalCode: subscriptionData.delivery.postalCode,
          cellPhone: subscriptionData.delivery.cellPhone
        } : undefined,
        selectedPlan: {
          name: subscriptionData.selectedPlan,
          price: planPrice
        },
        addons: addonsWithPrices.map(addon => ({
          name: addon.name,
          price: addon.price,
          quantity: addon.quantity || 1
        })),
        location: {
          id: subscriptionData.location,
          address: "",
          city: "",
          postalCode: ""
        },
        additionalScreens: additionalScreens,
        planQuantity: subscriptionData.planQuantity,
        totalScreens: subscriptionData.totalScreens,
        sendMethod: subscriptionData.sendMethod,
        authenticationMethod: subscriptionData.authenticationMethod,
        // includeLegalPackage: subscriptionData.includeLegalPackage,
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
        includeLegalPackage: subscriptionData.includeLegalPackage ?? true,
        planInfo: {
          contractType: subscriptionData.contractType || "individual"
        },
        frontendUrl: window.location.origin
      };
      
      console.log("📝 Contract Data before calling edge function:", JSON.stringify(contractData, null, 2));
      
      const {
        data,
        error: functionError
      } = await supabase.functions.invoke('signnow-contract', {
        body: contractData
      });
      if (functionError) throw functionError;
      if (!data?.success) throw new Error(data?.error || 'Failed to generate signing link');
      setDocumentId(data.documentId);
      setSigningLink(data.signingLink);
      setSuccess(true);
    } catch (err: any) {
      console.error('Error sending secure invitation:', err);
      setError(err.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };
  if (!subscriptionData) {
    return null;
  }
  return <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{t('title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading && <div className="text-center py-8">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
                <p className="text-lg">{t('loading.message')}</p>
              </div>}

            {success && <>
                <Alert className="border-green-500 bg-gray-600">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <AlertDescription className="ml-2 bg-gray-600">
                    {t('success.title')}
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 border rounded-lg">
                    <Mail className="h-6 w-6 text-blue-500 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold mb-2">{t('success.signingLinkTitle')}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {t('success.description')}
                      </p>
                      <p className="font-medium">{subscriptionData.owner.email}</p>
                      <p className="text-sm text-muted-foreground mt-3">
                        {t('success.instructionsDescription')}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">{t('success.documentIdLabel')}</h4>
                    <code className="text-sm px-2 py-1 rounded border block mb-3 bg-gray-500">{documentId}</code>
                    
                    <h4 className="font-semibold text-blue-900 mb-2">{t('success.signingLinkLabel')}</h4>
                    <div className="bg-white p-2 rounded border break-all text-sm">
                      <a href={signingLink || ''} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {signingLink}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button onClick={sendSecureInvitation} variant="outline" className="flex-1">
                    {t('buttons.resend')}
                  </Button>
                  <Button onClick={() => navigate("/")} className="flex-1">
                    {t('buttons.returnDashboard')}
                  </Button>
                </div>
              </>}

            {error && <>
                <Alert variant="destructive">
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription className="ml-2">
                    {error}
                  </AlertDescription>
                </Alert>

                <div className="flex gap-4">
                  <Button onClick={sendSecureInvitation} variant="outline" className="flex-1">
                    {t('buttons.tryAgain')}
                  </Button>
                  <Button onClick={() => navigate(-1)} variant="ghost" className="flex-1">
                    {t('buttons.goBack')}
                  </Button>
                </div>
              </>}
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default ContractSecure;