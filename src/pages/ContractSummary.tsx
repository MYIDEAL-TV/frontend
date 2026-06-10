import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/ui/navigation";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Check, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getPlanPrice, getAddonPrice, getScreenPrice } from "@/config/pricingConfig";

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
  location: string;
  owner: OwnerInfo;
  manager?: ManagerInfo;
  financialManager?: FinancialManagerInfo;
  delivery?: DeliveryInfo;
  selectedPlan: string;
  selectedAddons: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  totalScreens: number;
  planQuantity: number;
  additionalScreens?: number;
  planPrice?: number;
  addonsWithPrices?: Array<{ id: string; name: string; price: number; quantity: number }>;
  decoderRental?: boolean;
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
  customItemName?: string;
  customItemPrice?: number;
  selectedDecoders?: any[];
  selectedFlexChannels?: number[];
  extraFlexCost?: number;
  Tot_HT: string;
  Tot_Taxes: string;
  Tot_Mensuel: string;
  Tot_HT_Ponc: string;
  Tot_Taxes_Ponc: string;
  Tot_Ponc: string;
  currency: string;
}

const ContractSummary = () => {
  const { t } = useTranslation('contract');
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signature, setSignature] = useState<string>("");
  
  const subscriptionData = location.state as SubscriptionData;

  useEffect(() => {
    if (!subscriptionData) {
      toast({
        title: t('messages.noData.title'),
        description: t('messages.noData.description'),
        variant: "destructive",
      });
      navigate("/new-subscription");
    }
  }, [subscriptionData, navigate, toast, t]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignature(canvas.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature("");
  };

  const completeSignature = () => {
    if (!signature) {
      toast({
        title: t('messages.signatureRequired.title'),
        description: t('messages.signatureRequired.description'),
        variant: "destructive",
      });
      return;
    }

    toast({
      title: t('messages.contractCompleted.title'),
      description: t('messages.contractCompleted.description'),
    });
    
    // Here you would save the contract and signature data
    navigate("/new-subscription", { replace: true });
  };

  if (!subscriptionData) {
    return null;
  }

  const calculateTotal = () => {
    const basePlan = subscriptionData.planPrice ?? getPlanPrice(subscriptionData.selectedPlan);
    
    let addonsTotal = 0;
    if (subscriptionData.addonsWithPrices) {
      addonsTotal = subscriptionData.addonsWithPrices.reduce((sum, addon) => sum + addon.price, 0);
    } else {
      addonsTotal = subscriptionData.selectedAddons.reduce((sum, addonId) => 
        sum + getAddonPrice(addonId), 0);
    }
    
    const additionalScreens = subscriptionData.additionalScreens ?? Math.max(0, subscriptionData.totalScreens - subscriptionData.planQuantity);
    const screenPrice = getScreenPrice(subscriptionData.location);
    const screensTotal = additionalScreens * screenPrice;
    
    return basePlan + addonsTotal + screensTotal;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('summary.backButton')}
          </Button>
          <h1 className="text-3xl font-bold text-foreground">{t('summary.title')}</h1>
          <p className="text-muted-foreground">{t('summary.description')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contract Details */}
          <div className="space-y-6">
            <Card className="card-professional">
              <CardHeader>
                <CardTitle>{t('details.subscriptionTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground">{t('details.serviceLocation')}</h4>
                  <p className="text-muted-foreground">{subscriptionData.location}</p>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-semibold text-foreground">{t('details.subscriber')}</h4>
                  <p className="text-muted-foreground">
                    {subscriptionData.owner.firstName} {subscriptionData.owner.lastName}
                  </p>
                  <p className="text-muted-foreground">{subscriptionData.owner.email}</p>
                  <p className="text-muted-foreground">{subscriptionData.owner.cellPhone}</p>
                  <p className="text-muted-foreground">
                    {subscriptionData.owner.address}, {subscriptionData.owner.city} {subscriptionData.owner.postalCode}
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-semibold text-foreground">{t('details.planPricing')}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{t(`plans.${subscriptionData.selectedPlan}`)} {t('details.plan')}</span>
                      <span>{subscriptionData.currency === "EUR" ? "€" : "$"}{subscriptionData.planPrice?.toFixed(2)}</span>
                    </div>
                    {subscriptionData.selectedAddons.map((addon) => (
                      <div key={addon.id} className="flex justify-between">
                        <span>{addon.name} {t('details.addon')}</span>
                        <span>{subscriptionData.currency === "EUR" ? "€" : "$"}{addon.price.toFixed(2)}</span>
                      </div>
                    ))}
                    {subscriptionData.additionalScreens > 0 && (
                      <div className="flex justify-between">
                        <span>{subscriptionData.additionalScreens} {t('details.additionalScreens')}</span>
                        <span>{subscriptionData.currency === "EUR" ? "€" : "$"}{(subscriptionData.additionalScreens * 5.99).toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="pt-2 border-t space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal (HT)</span>
                        <span>{subscriptionData.currency === "EUR" ? "€" : "$"}{subscriptionData.Tot_HT}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground italic">
                        <span>Taxes</span>
                        <span>{subscriptionData.currency === "EUR" ? "€" : "$"}{subscriptionData.Tot_Taxes}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg text-primary pt-1">
                        <span>{t('details.totalMonthly')} (TTC)</span>
                        <span>{subscriptionData.currency === "EUR" ? "€" : "$"}{subscriptionData.Tot_Mensuel}</span>
                      </div>
                    </div>

                    {parseFloat(subscriptionData.Tot_Ponc) > 0 && (
                      <div className="mt-4 pt-2 border-t space-y-1">
                        <h4 className="font-semibold text-foreground mb-2">One-Time Fees</h4>
                        <div className="flex justify-between text-sm">
                          <span>Subtotal (HT)</span>
                          <span>{subscriptionData.currency === "EUR" ? "€" : "$"}{subscriptionData.Tot_HT_Ponc}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground italic">
                          <span>Taxes</span>
                          <span>{subscriptionData.currency === "EUR" ? "€" : "$"}{subscriptionData.Tot_Taxes_Ponc}</span>
                        </div>
                        <div className="flex justify-between font-bold text-md pt-1">
                          <span>Total Punctual (TTC)</span>
                          <span>{subscriptionData.currency === "EUR" ? "€" : "$"}{subscriptionData.Tot_Ponc}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-professional">
              <CardHeader>
                <CardTitle>{t('terms.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm text-muted-foreground">
                  <p>{t('terms.introduction')}</p>
                  <div>
                    <p className="font-semibold mb-2">{t('terms.compositionTitle')}</p>
                    <ul className="space-y-1 ml-4">
                      <li>(i) {t('terms.subscriptionForm')}</li>
                      <li>(ii) {t('terms.generalConditions')}</li>
                      <li>(iii) {t('terms.privacyPolicy')}</li>
                      <li>(iv) {t('terms.contractSummary')}</li>
                      <li>(v) {t('terms.standardizedSheet')}</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Signature Section */}
          <div>
            <Card className="card-professional">
              <CardHeader>
                <CardTitle>{t('signature.title')}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t('signature.description')}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-4">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={200}
                    className="w-full h-48 border border-border rounded cursor-crosshair bg-white"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                </div>
                
                <div className="flex space-x-3">
                  <Button variant="outline" onClick={clearSignature} className="flex-1">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {t('signature.clear')}
                  </Button>
                  <Button onClick={completeSignature} className="btn-professional flex-1">
                    <Check className="h-4 w-4 mr-2" />
                    {t('signature.complete')}
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground text-center">
                  {t('signature.agreement')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractSummary;