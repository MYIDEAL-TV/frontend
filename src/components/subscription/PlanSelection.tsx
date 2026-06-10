import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Monitor,
  Package,
  Plus,
  Info,
  MessageSquarePlus,
  ChevronUp,
  Layers,
  Loader2,
  Blocks,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useUserRole } from "@/hooks/useUserRole";

// Fallback to localhost if env variable is missing
const VITE_API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const env = import.meta.env.VITE_ENVIRONMENT || "development";

interface PlanSelectionProps {
  location: string; // Now a Database ID (e.g., "1")
  selectedPlan: string;
  onPlanChange: (plan: string) => void;
  selectedAddons: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  onAddonsChange: (
    addons: Array<{ id: string; name: string; price: number; quantity: number }>
  ) => void;
  totalScreens: number;
  onTotalScreensChange: (screens: number) => void;
  planQuantity: number;
  onPlanQuantityChange: (quantity: number) => void;
  extraFlexCost?: number;
  contractDuration: number;
  onContractDurationChange: (duration: number) => void;
  contractType: string;
  onContractTypeChange: (type: string) => void;
  decoderRental: boolean;
  onDecoderRentalChange: (rental: boolean) => void;
  decoderRentalComment: string;
  onDecoderRentalCommentChange: (comment: string) => void;
  decoderPurchaseComment: string;
  onDecoderPurchaseCommentChange: (comment: string) => void;
  planComment: string;
  onPlanCommentChange: (comment: string) => void;
  addonComments: Record<string, string>;
  onAddonCommentsChange: (comments: Record<string, string>) => void;
  customItemName: string;
  onCustomItemNameChange: (name: string) => void;
  customItemPrice: number;
  onCustomItemPriceChange: (price: number) => void;
  additionalScreensComment: string;
  onAdditionalScreensCommentChange: (comment: string) => void;
  locationAddlCost: number;
  maxScreensPerPackage: number;
  taxRate: number;
  decoderRentalPrice: number;
  selectedDecoders?: Array<{
    id: string;
    name: string;
    quantity: number;
    upfrontPrice: number;
    monthlyPrice: number;
  }>;
  currencySymbol?: string;
}

export const PlanSelection = ({
  location,
  selectedPlan,
  onPlanChange,
  selectedAddons,
  onAddonsChange,
  totalScreens,
  onTotalScreensChange,
  planQuantity,
  onPlanQuantityChange,
  contractDuration,
  onContractDurationChange,
  contractType,
  onContractTypeChange,
  decoderRental,
  onDecoderRentalChange,
  decoderRentalComment,
  onDecoderRentalCommentChange,
  decoderPurchaseComment,
  onDecoderPurchaseCommentChange,
  planComment,
  onPlanCommentChange,
  addonComments,
  onAddonCommentsChange,
  customItemName,
  onCustomItemNameChange,
  customItemPrice,
  onCustomItemPriceChange,
  additionalScreensComment,
  onAdditionalScreensCommentChange,
  locationAddlCost,
  maxScreensPerPackage,
  taxRate,
  decoderRentalPrice,
  selectedDecoders = [],
  extraFlexCost = 0,
  currencySymbol = "$",
}: PlanSelectionProps) => {
  const { t } = useTranslation(["subscription", "common"]);
  // --- 1. ID NORMALIZATION ---
  // Extract the actual ID string for use in the UI and filtering
  const effectivePlanId =
    typeof selectedPlan === "object" && selectedPlan !== null
      ? (selectedPlan as any).id?.toString()
      : selectedPlan?.toString();
  console.log(
    "🔄 PlanSelection Render: Effective Plan ID =",
    effectivePlanId,
    " selected Plan id: ",
    selectedPlan
  );
  // --- DATABASE STATE ---
  const [dbPackages, setDbPackages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isCustomer } = useUserRole();

  // Collapsible state for comments
  const [isPlanCommentOpen, setIsPlanCommentOpen] = useState(false);

  // --- 1. FETCH DYNAMIC PACKAGES ---
  useEffect(() => {
    if (!location) return;

    const fetchPackages = async () => {
      setIsLoading(true);
      try {
        // 1. Get the current Supabase Project ID dynamically from your .env
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

        // 2. Construct the local storage key automatically
        const storageKey = `sb-${projectId}-auth-token`;

        // 3. Safely parse the token
        const sessionData = JSON.parse(
          localStorage.getItem(storageKey) || "{}"
        );
        const token = sessionData.access_token || "";

        const response = await fetch(
          `${VITE_API_URL}/api/admin/packages?contractType=${contractType}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`, // Clean, dynamic, and bug-free
            },
          }
        );
        const data = await response.json();
        if (data.success) {
          const regionalPackages = data.packages.filter(
            (p: any) => p.location_id == location && p.status === "Active"
          );
          setDbPackages(regionalPackages);

          const basePlans = regionalPackages.filter(
            (p: any) => p.type?.toUpperCase() === "BASE"
          );

          if (basePlans.length > 0 && !effectivePlanId && !selectedPlan) {
            console.log(
              "🆕 Auto-selecting first plan because no draft exists."
            );
            onPlanChange(basePlans[0].id.toString());
          }
        }
      } catch (err) {
        console.error("Failed to load packages:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPackages();
  }, [location, contractType]);

  // --- 2. THE SYNCHRONIZATION EFFECT (With UI Delay) ---
  useEffect(() => {
    if (!isLoading && dbPackages.length > 0 && effectivePlanId) {
      const exists = dbPackages.find(
        (p) => p.id.toString() === effectivePlanId
      );

      if (exists) {
        const timer = setTimeout(() => {
          // Double check the state hasn't been wiped before locking it in
          console.log("💳 Plan Sync: Locking UI for ID", effectivePlanId);
          onPlanChange(exists.id.toString());
        }, 100); // 100ms gives the parent time to finish its state updates

        return () => clearTimeout(timer);
      }
    }
  }, [isLoading, dbPackages.length, effectivePlanId]);

  // Derived arrays based on Package Type
  const basePlans = dbPackages.filter((p) => p.type?.toUpperCase() === "BASE");
  const allAddonPlans = dbPackages.filter(
    (p) => p.type?.toUpperCase() === "ADD-ON"
  );

  // --- DYNAMIC ADD-ON FILTERING ---
  // 1. Find the currently selected Base Package
  const selectedPlanData = basePlans.find(
    (p) => p.id.toString() === effectivePlanId
  );

  // Safely extract eligible addons
  const eligibleAddonIds = selectedPlanData?.addon_ids || [];

  const eligibleAddonPlans = allAddonPlans.filter((addon) =>
    eligibleAddonIds.some((id: any) => id.toString() === addon.id.toString())
  );

  const calculatePricing = (
    totalScreens: number,
    maxScreens: number,
    type: string
  ) => {
    // --- 🚀 NEW: HOTEL PRICING RULE ---
    if (type === "hotel") {
      return {
        baseQty: totalScreens, // 1 Package per Screen
        additionalScreensQty: 0, // No "additional screen" concepts for hotels
        addonQty: totalScreens, // Addons scale 1:1 with packages
      };
    }
    // Rule 1: Packages = Total Screens / Max Screens (Rounded Up)
    const baseQty = Math.ceil(totalScreens / maxScreens);

    // Rule 2: Additional Screens = Total - Packages
    const additionalScreensQty = Math.max(0, totalScreens - baseQty);

    // Rule 3: Add-on Qty = Base Package Qty
    const addonQty = baseQty;

    return { baseQty, additionalScreensQty, addonQty };
  };

  const { baseQty, additionalScreensQty, addonQty } = calculatePricing(
    totalScreens,
    maxScreensPerPackage || 1,
    contractType
  );

  // Sync plan quantity with baseQty from matrix
  useEffect(() => {
    if (baseQty !== planQuantity && baseQty > 0) {
      onPlanQuantityChange(baseQty);
    }
  }, [baseQty, planQuantity, onPlanQuantityChange]);

  const basePlanPrice = selectedPlanData ? Number(selectedPlanData.price) : 0;
  const totalAddonPrice = selectedAddons.reduce(
    (sum, addon) => sum + addon.price,
    0
  );

  const decoderMonthlyTotal = selectedDecoders.reduce(
    (sum, d) => sum + d.monthlyPrice * d.quantity,
    0
  );

  const monthlyHT =
    baseQty * basePlanPrice +
    addonQty * totalAddonPrice +
    additionalScreensQty * locationAddlCost +
    (customItemPrice || 0) +
    decoderMonthlyTotal +
    extraFlexCost;

  const monthlyTaxes = monthlyHT * taxRate;
  const monthlyTotalTTC = monthlyHT + monthlyTaxes;

  // --- SAFETY CLEANUP EFFECT ---
  // If the user changes the Base Package, uncheck any Add-ons that are no longer eligible
  useEffect(() => {
    // 🛡️ CRITICAL GUARD: Don't wipe selections while we are still loading!
    if (!isLoading && dbPackages.length > 0 && selectedAddons.length > 0) {
      const stillValidAddons = selectedAddons.filter((addon) =>
        eligibleAddonIds.some(
          (id: any) => id.toString() === addon.id.toString()
        )
      );
      if (stillValidAddons.length !== selectedAddons.length) {
        console.log("🧹 Cleaning up invalid addons for plan", effectivePlanId);
        onAddonsChange(stillValidAddons);
      }
    }
  }, [selectedPlan, dbPackages, isLoading, eligibleAddonIds]);

  // Sync addon quantities with plan quantity
  useEffect(() => {
    if (selectedAddons.length > 0 && planQuantity > 0) {
      const needsUpdate = selectedAddons.some(
        (addon) => addon.quantity !== planQuantity
      );
      if (needsUpdate) {
        const updatedAddons = selectedAddons.map((addon) => ({
          ...addon,
          quantity: planQuantity,
        }));
        onAddonsChange(updatedAddons);
      }
    }
  }, [planQuantity]);

  // UPDATE THIS FUNCTION:
  const handleAddonChange = (addon: any, checked: boolean) => {
    if (checked) {
      onAddonsChange([
        ...selectedAddons,
        {
          id: addon.id.toString(),
          name: addon.name,
          price: Number(addon.price),
          quantity: planQuantity,
        },
      ]);
    } else {
      onAddonsChange(
        selectedAddons.filter((a) => a.id !== addon.id.toString())
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          {t("planSelection.title")}
        </h2>
        <p className="text-muted-foreground">
          {t("planSelection.description")}
        </p>
      </div>

      {/* PLAN SELECTION */}
      <Card className="card-professional">
        <CardHeader>
          <CardTitle className="text-lg flex justify-between items-center">
            <span>{t("planSelection.choosePlan")}</span>
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {basePlans.length === 0 && !isLoading ? (
            <div className="text-center py-6 text-slate-500 italic">
              No base packages available for this region.
            </div>
          ) : (
            <RadioGroup
              // --- FIX: Use the normalized string ID ---
              value={effectivePlanId || ""}
              onValueChange={onPlanChange}
              className="space-y-4"
              disabled={isLoading}
            >
              {basePlans.map((plan) => {
                const planIdString = plan.id.toString();
                const isSelected = selectedPlan === planIdString;

                return (
                  <div key={plan.id} className="flex items-start space-x-3">
                    <RadioGroupItem
                      value={planIdString}
                      id={`plan-${plan.id}`}
                      className="mt-1"
                    />
                    <Label
                      htmlFor={`plan-${plan.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <Card
                        className={`transition-all duration-200 ${
                          isSelected
                            ? "ring-2 ring-primary bg-primary/5"
                            : "hover:bg-accent/50"
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <Package className="h-6 w-6 text-primary" />
                              <div>
                                <h3 className="font-semibold text-lg">
                                  {plan.name}
                                </h3>
                                <p className="text-muted-foreground text-sm">
                                  {plan.description}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <Badge
                                  variant="secondary"
                                  className="text-lg font-bold"
                                >
                                  {currencySymbol}
                                  {Number(plan.price).toFixed(2)}
                                </Badge>
                                {isSelected && planQuantity > 1 && (
                                  <>
                                    <Badge
                                      variant="secondary"
                                      className="ml-2 text-xs"
                                    >
                                      × {planQuantity}
                                    </Badge>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Total: {currencySymbol}
                                      {(
                                        Number(plan.price) * planQuantity
                                      ).toFixed(2)}
                                      /mo
                                    </div>
                                  </>
                                )}
                              </div>
                              {isSelected && !isCustomer && (
                                <Collapsible
                                  open={isPlanCommentOpen}
                                  onOpenChange={setIsPlanCommentOpen}
                                >
                                  <CollapsibleTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                    >
                                      {isPlanCommentOpen ? (
                                        <ChevronUp className="h-4 w-4" />
                                      ) : (
                                        <MessageSquarePlus className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </CollapsibleTrigger>
                                </Collapsible>
                              )}
                            </div>
                          </div>

                          {/* --- NEW: BLUEPRINT BADGE (Dynamic) --- */}
                          <div className="mt-4 flex gap-3">
                            <Badge
                              variant="outline"
                              className="flex items-center gap-1.5 text-xs py-1"
                            >
                              <Layers size={12} className="text-primary" />
                              {plan.template_name
                                ? `${plan.template_name} (${plan.template_total_channels} Ch)`
                                : `${plan.channel_model} Channel Tier`}
                            </Badge>

                            {(plan.template_flex_channels > 0 ||
                              plan.flex_channel_quota > 0) && (
                              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 text-xs py-1">
                                +{" "}
                                {plan.template_flex_channels ||
                                  plan.flex_channel_quota}{" "}
                                Flex Selections
                              </Badge>
                            )}
                          </div>

                          {/* Plan Comment Field */}
                          {isSelected && (
                            <Collapsible
                              open={isPlanCommentOpen}
                              onOpenChange={setIsPlanCommentOpen}
                            >
                              <CollapsibleContent className="pt-4">
                                <div className="relative">
                                  <Textarea
                                    placeholder={t("planSelection.addNote")}
                                    value={planComment}
                                    onChange={(e) =>
                                      onPlanCommentChange(e.target.value)
                                    }
                                    maxLength={200}
                                    className="min-h-[80px] resize-none"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                                    {planComment.length}/200
                                  </span>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          )}
                        </CardContent>
                      </Card>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          )}
        </CardContent>
      </Card>

      {/* DYNAMIC ADD-ONS */}
      <Card className="card-professional">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Blocks className="h-5 w-5 text-primary" />
            {t("planSelection.addons.title")}
          </CardTitle>
          <CardDescription>
            Optional upgrades available for your selected Base Package.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedPlan ? (
            <p className="text-muted-foreground text-center py-4 italic">
              Select a Base Package to see eligible Add-ons.
            </p>
          ) : eligibleAddonPlans.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {eligibleAddonPlans.map((addon) => {
                const addonIdString = addon.id.toString();
                const isSelected = selectedAddons.some(
                  (a) => a.id === addonIdString
                );

                return (
                  <div key={addon.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`addon-${addon.id}`}
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        handleAddonChange(addon, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`addon-${addon.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div
                        className={`p-3 rounded-lg border transition-all duration-200 ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-accent/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{addon.name}</span>
                            {isSelected && planQuantity > 1 && (
                              <Badge
                                variant="secondary"
                                className="ml-2 text-xs"
                              >
                                × {planQuantity}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <Badge
                                variant="outline"
                                className={
                                  isSelected
                                    ? "border-primary text-primary"
                                    : ""
                                }
                              >
                                +{currencySymbol}
                                {Number(addon.price).toFixed(2)}
                              </Badge>
                              {isSelected && planQuantity > 1 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Total: {currencySymbol}
                                  {(Number(addon.price) * planQuantity).toFixed(
                                    2
                                  )}
                                  /mo
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4 italic">
              No add-ons are available or eligible for this specific base
              package.
            </p>
          )}
        </CardContent>
      </Card>

      {!isCustomer && (
        <Card className="card-professional">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Plus className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {t("planSelection.customItem.title")}
              </span>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="customItemName" className="text-xs">
                  {t("planSelection.customItem.nameLabel")}
                </Label>
                <Input
                  id="customItemName"
                  type="text"
                  placeholder={t("planSelection.customItem.namePlaceholder")}
                  value={customItemName}
                  onChange={(e) => onCustomItemNameChange(e.target.value)}
                  maxLength={100}
                  className="h-9"
                />
              </div>
              <div className="w-32 space-y-1.5">
                <Label htmlFor="customItemPrice" className="text-xs">
                  {t("planSelection.customItem.priceLabel")}
                </Label>
                <Input
                  id="customItemPrice"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={customItemPrice || ""}
                  onChange={(e) => {
                    // Parse the value, allowing negative numbers
                    const val = parseFloat(e.target.value);
                    onCustomItemPriceChange(isNaN(val) ? 0 : val);
                  }}
                  className="h-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PRICING BREAKDOWN */}
      <div className="mt-6 border-t pt-4">
        <h3 className="text-md font-bold mb-2">Pricing Breakdown</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span>Base Plan ({baseQty}x):</span>
          <span className="text-right">
            {currencySymbol}
            {(baseQty * basePlanPrice).toFixed(2)}
          </span>

          {selectedAddons.length > 0 && (
            <>
              <span>Add-ons ({addonQty}x):</span>
              <span className="text-right">
                {currencySymbol}
                {(addonQty * totalAddonPrice).toFixed(2)}
              </span>
            </>
          )}

          {additionalScreensQty > 0 && (
            <>
              <span>Addl. Screens ({additionalScreensQty}x):</span>
              <span className="text-right">
                {currencySymbol}
                {(additionalScreensQty * locationAddlCost).toFixed(2)}
              </span>
            </>
          )}

          {/* 🚀 THE FIX: Handles both Monthly and Upfront Prices correctly! */}
          {selectedDecoders.length > 0
            ? selectedDecoders.map((decoder) => (
                <div key={decoder.id} className="contents">
                  {/* Monthly Rental Render */}
                  {decoder.monthlyPrice > 0 && (
                    <>
                      <span>
                        {decoder.name} (Monthly) ({decoder.quantity}x):
                      </span>
                      <span className="text-right">
                        {currencySymbol}
                        {(decoder.quantity * decoder.monthlyPrice).toFixed(2)}
                      </span>
                    </>
                  )}
                  {/* Upfront Purchase Render */}
                  {decoder.upfrontPrice > 0 && (
                    <>
                      <span className="text-muted-foreground">
                        {decoder.name} (One-Time Fee) ({decoder.quantity}x):
                      </span>
                      <span className="text-right text-muted-foreground">
                        {currencySymbol}
                        {(decoder.quantity * decoder.upfrontPrice).toFixed(2)}
                      </span>
                    </>
                  )}
                  {/* Fallback for $0 items */}
                  {decoder.monthlyPrice === 0 && decoder.upfrontPrice === 0 && (
                    <>
                      <span>
                        {decoder.name} ({decoder.quantity}x):
                      </span>
                      <span className="text-right">{currencySymbol}0.00</span>
                    </>
                  )}
                </div>
              ))
            : decoderRental && (
                <>
                  <span>
                    Decoder Rental ({baseQty + additionalScreensQty}x):
                  </span>
                  <span className="text-right">
                    {currencySymbol}
                    {(
                      (baseQty + additionalScreensQty) *
                      decoderRentalPrice
                    ).toFixed(2)}
                  </span>
                </>
              )}

          {extraFlexCost > 0 && (
            <div className="col-span-2 flex justify-between items-center text-sm font-medium text-orange-700 bg-orange-50 p-2 mt-1 rounded">
              <span>Extra Flex Channels</span>
              <span>
                + {currencySymbol}
                {extraFlexCost.toFixed(2)}/mo
              </span>
            </div>
          )}

          {customItemPrice !== 0 && (
            <>
              <span>{customItemName || "Custom Item"}:</span>
              <span
                className={`text-right ${
                  customItemPrice < 0 ? "text-green-600" : ""
                }`}
              >
                {customItemPrice < 0 ? "-" : ""}
                {currencySymbol}
                {Math.abs(customItemPrice).toFixed(2)}
              </span>
            </>
          )}

          <div className="col-span-2 border-t mt-2 pt-2 flex justify-between font-semibold">
            <span>Subtotal (HT):</span>
            <span>
              {currencySymbol}
              {monthlyHT.toFixed(2)}
            </span>
          </div>

          <div className="col-span-2 flex justify-between text-muted-foreground italic">
            <span>Taxes ({(taxRate * 100).toFixed(0)}%):</span>
            <span>
              {currencySymbol}
              {monthlyTaxes.toFixed(2)}
            </span>
          </div>

          <div className="col-span-2 border-t mt-2 pt-2 flex justify-between font-bold text-lg text-primary">
            <span>Total Monthly (TTC):</span>
            <span>
              {currencySymbol}
              {monthlyTotalTTC.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
