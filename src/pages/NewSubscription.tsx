import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/ui/navigation";
import { LocationPicker } from "@/components/subscription/LocationPicker";
import { DemographicsSection } from "@/components/subscription/DemographicsSection";
import { PlanSelection } from "@/components/subscription/PlanSelection";
import { SenderConfirmationDialog } from "@/components/subscription/SenderConfirmationDialog";
import { NicknameModal } from "@/components/subscription/NicknameModal";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { useUserRole } from "@/hooks/useUserRole";
import "react-phone-number-input/style.css";
import { isValidPhoneNumber } from "react-phone-number-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Info,
  Wrench,
  Monitor,
  MapPin,
  Package,
  MessageSquarePlus,
  Tablet,
  ChevronUp,
  Loader2,
  AlertTriangle,
  ListVideo, // ADDED
  CheckCircle2, // ADDED
  Search,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useStaffUser } from "@/hooks/useStaffUser";
import { supabase } from "@/integrations/supabase/client";

// Define the API URL for database fetching
const VITE_API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export interface OwnerInfo {
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string;
  landlinePhone: string;
  companyName: string;
  accommodationName: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  acceptsMarketing: boolean;
}
export interface ManagerInfo {
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string;
  companyName: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}
export interface FinancialManagerInfo {
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string;
  landlinePhone: string;
}
export interface DeliveryInfo {
  address: string;
  city: string;
  postalCode: string;
  cellPhone: string;
}
export interface SelectedDecoder {
  id: string;
  name: string;
  quantity: number;
  upfrontPrice: number;
  monthlyPrice: number;
}
export const emptyOwnerInfo: OwnerInfo = {
  firstName: "",
  lastName: "",
  email: "",
  cellPhone: "",
  landlinePhone: "",
  companyName: "",
  accommodationName: "",
  address: "",
  city: "",
  postalCode: "",
  country: "",
  acceptsMarketing: true,
};

export const emptyManagerInfo: ManagerInfo = {
  firstName: "",
  lastName: "",
  email: "",
  cellPhone: "",
  companyName: "",
  address: "",
  city: "",
  postalCode: "",
  country: "",
};
export const emptyFinancialManagerInfo: FinancialManagerInfo = {
  firstName: "",
  lastName: "",
  email: "",
  cellPhone: "",
  landlinePhone: "",
};
export const emptyDeliveryInfo: DeliveryInfo = {
  address: "",
  city: "",
  postalCode: "",
  cellPhone: "",
};

const NewSubscription = () => {
  const isInitialHydration = useRef(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAuthorized, isAdmin, isCustomer } = useUserRole();
  const [currentProposalId, setCurrentProposalId] = useState<string | null>(
    null
  );
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateStatus, setDuplicateStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [userTypes, setUserTypes] = useState<any[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const { t } = useTranslation(["subscription", "common"]);
  const { user } = useAuth();
  const {
    staffUserId,
    staffEmail,
    staffFullName,
    loading: staffLoading,
  } = useStaffUser();
  const [currentStep, setCurrentStep] = useState(1);
  const [location, setLocation] = useState("");
  const navLocation = useLocation();
  const [dbServiceFees, setDbServiceFees] = useState<any[]>([]); // NEW STATE

  // --- NEW DECODER OPTIONS STATE ---

  const [availableDecoders, setAvailableDecoders] = useState<any[]>([]);
  const [selectedDecoders, setSelectedDecoders] = useState<SelectedDecoder[]>(
    []
  );

  const [selectedFlexChannels, setSelectedFlexChannels] = useState<number[]>(
    []
  );
  const [extraFlexEnabled, setExtraFlexEnabled] = useState(false);
  const [flexItemPrice, setFlexItemPrice] = useState(2.0); // Base price per extra flex
  const [isLoadingDecoders, setIsLoadingDecoders] = useState(false);
  // --- NEW FLEX CHANNELS STATE ---
  const [baseFlexLimit, setBaseFlexLimit] = useState(0); // <-- ADD THIS LINE
  const [availableFlexChannels, setAvailableFlexChannels] = useState<any[]>([]);
  const [flexSearchQuery, setFlexSearchQuery] = useState(""); // <-- ADD THIS LINE
  // --- NEW HELPER TO HANDLE SELECTION ---
  const handleDecoderQuantityChange = (decoderInfo: any, newQty: number) => {
    setSelectedDecoders((prev) => {
      if (newQty === 0) {
        return prev.filter((d) => d.id !== decoderInfo.id);
      }
      const existing = prev.find((d) => d.id === decoderInfo.id);
      if (existing) {
        return prev.map((d) =>
          d.id === decoderInfo.id ? { ...d, quantity: newQty } : d
        );
      }
      return [
        ...prev,
        {
          id: decoderInfo.id,
          name: decoderInfo.name,
          quantity: newQty,
          upfrontPrice: Number(decoderInfo.upfront_price) || 0,
          monthlyPrice: Number(decoderInfo.monthly_price) || 0,
        },
      ];
    });
  };
  // --- NICKNAME MODAL STATE ---
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [pendingSubmitAction, setPendingSubmitAction] = useState<string | null>(
    null
  );
  const confirmedNicknameRef = useRef("");

  // INTERCEPTOR: Opens the modal instead of submitting immediately
  const handleInitiateSubmission = (action: string) => {
    setPendingSubmitAction(action);
    setShowNicknameModal(true);
  };

  // CALLBACK: Fires when the modal successfully verifies the nickname
  const handleNicknameConfirmed = (nickname: string) => {
    confirmedNicknameRef.current = nickname;
    setShowNicknameModal(false);

    // Resume the exact flow the user intended
    if (pendingSubmitAction === "customer") {
      handleSubmitCustomer(false);
    } else if (pendingSubmitAction === "kiosk") {
      handleKioskSignature();
    } else if (pendingSubmitAction === "send") {
      handleSendContract_Taylor();
    }
  };
  // --- DATABASE CACHE FOR FINAL PAYLOAD MATH ---
  const [dbLocations, setDbLocations] = useState<any[]>([]);
  const [dbPackages, setDbPackages] = useState<any[]>([]);

  const currentLocId =
    typeof location === "object" && location !== null
      ? (location as any).id
      : location;
  const currentLocationDb = dbLocations.find((l) => l.id == currentLocId);
  const maxScreensPerPackage = currentLocationDb?.max_screens_per_package || 4;

  // --- HELPER TO BUILD DYNAMIC DATABASE PAYLOAD ---
  const buildSubscriptionData = (
    approverName: string,
    approverEmail: string
  ) => {
    const selectedPlanDb = dbPackages.find((p) => p.id == selectedPlan);
    const currentLocationDb = dbLocations.find((l) => l.id == location);

    // 🚀 FIX: Extract dynamic screen cost directly from the database configuration
    const dynamicScreenCost =
      currentLocationDb?.additional_screen_cost !== undefined
        ? Number(currentLocationDb.additional_screen_cost)
        : 10;

    // 1. LOCATION FUZZY MATCHING
    let legacyLocationId = "saint-martin";
    const dbLocName = currentLocationDb?.name?.toLowerCase() || "";
    if (dbLocName.includes("barthelemy") || dbLocName.includes("barthélemy")) {
      legacyLocationId = "saint-barthelemy";
    } else if (dbLocName.includes("maarten")) {
      legacyLocationId = "sint-maarten";
    } else {
      legacyLocationId = "saint-martin";
    }

    // --- NEW: TICKET #98 & #99 (Currency & Taxes) ---
    // Safely extract from DB, with fallbacks based on your business rules
    const currency =
      currentLocationDb?.currency ||
      (legacyLocationId === "sint-maarten" ? "USD" : "EUR");
    const taxDesc =
      currentLocationDb?.tax_desc ||
      (legacyLocationId === "saint-martin" ? "TGCA" : "None");
    const taxAmount =
      currentLocationDb?.tax_amount ||
      (legacyLocationId === "saint-martin" ? 0.04 : 0);

    // --- NEW: TICKET #100 (Standard vs Hotel Pricing Math) ---
    // --- ALIGNED WITH PRICING ENGINE PDF ---
    const isHotel = contractType === "hotel";
    const maxScreens = currentLocationDb?.max_screens_per_package || 4; // Default to 4 per PDF [cite: 826]

    let finalPlanQuantity = planQuantity;
    let additionalScreens = 0;

    if (isHotel) {
      // Commercial Rule: Price is simply # Screens * Monthly Price [cite: 824]
      finalPlanQuantity = totalScreens;
      additionalScreens = 0;
    } else {
      // Standard Rule (1): Number of base packages is CEIL(#Total Screens / MaxScreens) [cite: 828, 836]
      // The PDF table shows 5 screens = 2 packages [cite: 836]
      finalPlanQuantity = Math.ceil(totalScreens / maxScreens);

      // Standard Rule (2): Number of Additional Screens = Total Screens - # of Packages [cite: 829, 836]
      // The PDF table shows 5 screens = 3 Add'l Screens [cite: 836]
      additionalScreens = Math.max(0, totalScreens - finalPlanQuantity);
    }
    // 2. PACKAGE FUZZY MATCHING
    let legacyPlanName = "basic_us";
    const dbPkgName = selectedPlanDb?.name?.toLowerCase() || "";
    if (
      dbPkgName.includes("gold") ||
      dbPkgName.includes("full") ||
      dbPkgName.includes("premium") ||
      dbPkgName.includes("all")
    ) {
      legacyPlanName = "full_us";
    } else if (
      dbPkgName.includes("sbh") ||
      legacyLocationId === "saint-barthelemy"
    ) {
      legacyPlanName = "sbh";
    } else {
      legacyPlanName = "basic_us";
    }

    const planPrice = selectedPlanDb ? Number(selectedPlanDb.price) : 0;
    const langContract = currentLocationDb?.language || "en";

    // --- NEW: TICKET #98 & #99 (Frontend Calculation Logic) ---
    const taxRate = Number(taxAmount || 0);

    // 1. Monthly Recurring Calculation (Add Extra Flex Math)
    // 🚀 FIX: Limit is strictly base limit, ignoring package quantity multiplier
    const totalFreeFlexAllowed = baseFlexLimit;
    const extraFlexCount = Math.max(
      0,
      selectedFlexChannels.length - totalFreeFlexAllowed
    );
    const extraFlexCost = extraFlexEnabled ? extraFlexCount * flexItemPrice : 0;

    const planTotal = planPrice * finalPlanQuantity;
    const addonsTotal = selectedAddons.reduce(
      (sum, addon) => sum + addon.price * finalPlanQuantity,
      0
    );
    // 🚀 FIX: Use the extracted dynamic cost
    const additionalScreensTotal = additionalScreens * dynamicScreenCost;

    // Calculate total monthly rent from selected mix-and-match decoders
    const rentalCost = selectedDecoders.reduce(
      (sum, d) => sum + d.monthlyPrice * d.quantity,
      0
    );

    const totHT =
      planTotal +
      addonsTotal +
      additionalScreensTotal +
      (customItemPrice || 0) +
      rentalCost +
      extraFlexCost;
    const totTaxes = totHT * taxRate;
    const totMensuel = totHT + totTaxes;

    // 2. One-Time Punctual Calculation
    let punctualSubtotal = 0;

    // 🚀 NEW: Add all dynamic selected fees
    const dynamicFeesTotal = selectedFees.reduce(
      (sum, fee) => sum + fee.price,
      0
    );
    punctualSubtotal += dynamicFeesTotal;

    // Calculate total upfront cost from selected mix-and-match decoders
    const upfrontDecoderCost = selectedDecoders.reduce(
      (sum, d) => sum + d.upfrontPrice * d.quantity,
      0
    );
    punctualSubtotal += upfrontDecoderCost;
    if (otherHardwareEnabled) punctualSubtotal += otherHardwareCost || 0;
    if (otherHardware2Enabled) punctualSubtotal += otherHardware2Cost || 0;
    punctualSubtotal += autrePoncCost || 0;

    const totHTPonc = punctualSubtotal;
    const totTaxesPonc = totHTPonc * taxRate;
    const totPonc = totHTPonc + totTaxesPonc;

    // 3. Format Addons (UPDATED)
    const addonsWithPrices = selectedAddons.map((addon) => {
      return {
        id: addon.id,
        name: addon.name,
        price: addon.price,
        quantity: finalPlanQuantity, // Still scaling correctly for Hotels!
      };
    });

    // 🚀 FIX: DYNAMICALLY INJECT EXTRA FLEX CHANNELS INTO THE CONTRACT TABLE 🚀
    if (extraFlexEnabled && extraFlexCount > 0) {
      addonsWithPrices.push({
        id: "extra-flex-addon",
        name: `Extra Flex Channels`,
        price: flexItemPrice,
        quantity: extraFlexCount,
      });
    }

    const formattedOwner = { ...owner, cellPhone: owner.cellPhone };

    return {
      nickname: confirmedNicknameRef.current,
      location: legacyLocationId,
      originalLocation: location, // Preserve original for resume/edit
      currency, // INJECTED FOR EDGE FUNCTION
      taxDesc, // INJECTED FOR EDGE FUNCTION
      taxAmount, // INJECTED FOR EDGE FUNCTION
      langContract,
      owner: formattedOwner,
      manager,
      financialManager,
      delivery,
      selectedPlan: selectedPlanDb?.name || legacyPlanName,
      originalPlan: selectedPlan, // Preserve original for resume/edit
      selectedAddons,
      totalScreens,
      planQuantity: finalPlanQuantity, // INJECTED HOTEL MATH
      additionalScreens, // INJECTED HOTEL MATH
      additionalScreenUnitCost: dynamicScreenCost,
      planPrice,
      addonsWithPrices,
      contractType,
      planInfo: { contractType: contractType || "individual" },
      includeLegalPackage: true,
      // Monthly Recurring Placeholders
      Tot_HT: totHT.toFixed(2),
      Tot_Taxes: totTaxes.toFixed(2),
      Tot_Mensuel: totMensuel.toFixed(2),
      // One-Time Punctual Placeholders
      Tot_HT_Ponc: totHTPonc.toFixed(2),
      Tot_Taxes_Ponc: totTaxesPonc.toFixed(2),
      Tot_Ponc: totPonc.toFixed(2),
      // ... (Keep the rest of your exact existing return object below this line)
      staffUserId,
      staffEmail: user?.email || "",
      decoderRental,
      decoderRentalComment,
      decoderPurchaseComment,
      planComment,
      addonComments,
      additionalScreensComment,
      customItemName,
      customItemPrice,
      autrePoncText,
      autrePoncCost,
      decoderHardwareEnabled,
      decoderHardwareCost,
      otherHardwareEnabled,
      otherHardwareName,
      otherHardwareCost,
      otherHardware2Enabled,
      otherHardware2Name,
      otherHardware2Cost,
      addSepaMandate,
      selectedDecoders,
      selectedFees,
      sepaData: addSepaMandate ? sepaData : undefined,
      addCcAuthorization,
      approverName,
      approverEmail,
      sendMethod: "email",
      authenticationMethod: "password",
      selectedFlexChannels,
      extraFlexCost,
      extraFlexEnabled,
    };
  };
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

  useEffect(() => {
    if (isCustomer && !isAdmin && user?.user_metadata) {
      console.log("Metadata Keys Found:", Object.keys(user.user_metadata));
      const m = user.user_metadata;
      console.log("Attempting to pre-fill owner info with metadata:", m);
      setOwner((prev) => {
        // Only update if current name is empty to prevent overwriting manual edits
        const updates: Partial<OwnerInfo> = {};

        if (!prev.email && user.email) updates.email = user.email;

        // Name mapping
        if (!prev.firstName) {
          if (m.first_name) updates.firstName = m.first_name;
          else if (m.full_name) updates.firstName = m.full_name.split(" ")[0];
        }

        if (!prev.lastName) {
          if (m.last_name) updates.lastName = m.last_name;
          else if (m.full_name)
            updates.lastName = m.full_name.split(" ").slice(1).join(" ");
        }

        // Phone mapping
        if (!prev.cellPhone) {
          updates.cellPhone = m.phone || m.cell_phone || "";
        }

        // Address mapping
        if (!prev.address) updates.address = m.address || "";
        if (!prev.city) updates.city = m.city || "";
        if (!prev.postalCode) updates.postalCode = m.postal_code || "";

        if (Object.keys(updates).length > 0) {
          return { ...prev, ...updates };
        }
        return prev;
      });
    }
  }, [isCustomer, isAdmin, user]);

  const handleSaveProgress = async () => {
    setIsSaving(true);
    try {
      const headers = await getSecureHeaders();
      const approverName = isCustomer
        ? `${owner.firstName} ${owner.lastName}`.trim()
        : "";
      const approverEmail = isCustomer ? user?.email || owner.email : "";

      const rawData = buildSubscriptionData(approverName, approverEmail);

      // --- FIX: Ensure the saved data structure matches our resume logic ---
      // 1. Resolve the Plan ID safely
      const planId = (selectedPlan as any)
        ? typeof selectedPlan === "object"
          ? (selectedPlan as any).id
          : selectedPlan
        : rawData.selectedPlan || ""; // Fallback to rawData or empty string

      // 2. Resolve the Location safely
      const locObj = location
        ? typeof location === "object"
          ? location
          : { id: location }
        : { id: rawData.location || "" }; // Fallback to rawData or empty object

      const payload = {
        ...rawData,
        selectedPlan: {
          id: planId,
          name: rawData.selectedPlan || "",
          price: rawData.planPrice || rawData.planPrice || 0,
        },
        location: locObj,
        proposalId: currentProposalId,
      };

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/customer/proposal/save`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            proposalId: currentProposalId,
            formData: payload, // Saving the enriched payload
          }),
        }
      );

      const data = await res.json();
      if (data.success) {
        setCurrentProposalId(data.proposalId);
        toast({
          title: "Progress Saved",
          description: "You can resume this later from your profile.",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Could not save progress.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitCustomer = async (forceDuplicate = false) => {
    if (!selectedPlan) {
      return toast({
        title: "Missing Information",
        description: "Please select a plan before generating the contract.",
        variant: "destructive",
      });
    }
    setIsSaving(true);
    try {
      const approverName = `${owner.firstName} ${owner.lastName}`.trim();
      const approverEmail = user?.email || owner.email;

      const rawData = buildSubscriptionData(approverName, approverEmail);

      // --- ROBUST MAPPING FIX ---
      const planId = (selectedPlan as any)
        ? typeof selectedPlan === "object"
          ? (selectedPlan as any).id
          : selectedPlan
        : rawData.selectedPlan || "";

      const payload = {
        ...rawData,
        contractType: rawData.contractType,
        sendMethod: "embed",
        selectedDecoders: selectedDecoders,
        selectedFees: selectedFees,
        frontendUrl: window.location.origin,
        proposalId: currentProposalId,
        subscriberInfo: rawData.owner,
        partnerInfo: rawData.manager,
        guarantorInfo: rawData.financialManager,
        deliveryInfo: rawData.delivery,

        // Ensure this is ALWAYS an object with an ID for the backend
        selectedPlan: {
          id: planId,
          name:
            (selectedPlan as any) && typeof selectedPlan === "object"
              ? (selectedPlan as any).name
              : rawData.selectedPlan || "",
          price: rawData.planPrice || 0,
        },

        addons: rawData.addonsWithPrices,
        durationMonths: contractDuration,
        planInfo: { contractType: contractType || "individual" },
        includeLegalPackage: true,

        // Ensure location is ALWAYS an object for the Edge Function
        location: {
          id: rawData.location, // Use the string slug like 'saint-barthelemy'
          address: owner.address,
          city: owner.city,
          postalCode: owner.postalCode,
        },
        selectedFlexChannels: rawData.selectedFlexChannels,
        extraFlexCost: rawData.extraFlexCost,
        forceDuplicate: forceDuplicate,
      };

      const headers = await getSecureHeaders();
      // Send the properly formatted payload to the backend
      const res = await fetch(`${VITE_API_URL}/api/admin/subscriptions/draft`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      // -----------------------------------------------------------------
      // 🚀 DEBUG SHIELD: CATCH HTML ERRORS AND SHOW THEM ON SCREEN
      // -----------------------------------------------------------------
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const rawHtml = await res.text();
        console.error(
          "CRITICAL: Server returned HTML instead of JSON!",
          rawHtml
        );

        // This will pop open a new tab and literally render the HTML error
        // so you and DevOps can see exactly what crashed (e.g. Nginx 504 Timeout)
        const debugWindow = window.open("", "_blank");
        if (debugWindow) {
          debugWindow.document.write(rawHtml);
          debugWindow.document.close();
        }

        throw new Error(
          `Server Error (${res.status}). A new tab was opened with the crash details.`
        );
      }
      // -----------------------------------------------------------------

      const data = await res.json();
      // 🚨 CATCH DUPLICATE HERE 🚨
      // 🚨 CATCH DUPLICATE HERE 🚨
      if (res.status === 409 || data.isDuplicate) {
        setDuplicateStatus(data.existingStatus);
        setShowDuplicateModal(true);
        setIsSaving(false);
        return; // Stop the flow
      }
      if (data.success) {
        toast({
          title: "Contract Sent!",
          description:
            "Your contract is generating. You can sign it from the Pending Contracts tab in your Profile.",
        });
        navigate("/profile"); // Send them straight to their dashboard
      } else {
        throw new Error(data.error || "Failed to generate contract");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    // Fetch global DB configs once when the form mounts so we can do math securely
    const loadDbConfigs = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;

        const headers = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        // 🚀 FIX: Removed the service-fees API call
        const [locRes, pkgRes] = await Promise.all([
          fetch(`${VITE_API_URL}/api/admin/locations`, { headers }),
          fetch(`${VITE_API_URL}/api/admin/packages`, { headers }),
        ]);

        const locData = await locRes.json();
        const pkgData = await pkgRes.json();

        if (locData.success) setDbLocations(locData.locations);
        if (pkgData.success) setDbPackages(pkgData.packages);
      } catch (err) {
        console.error("Failed to load global DB configs", err);
      }
    };
    loadDbConfigs();
  }, []);

  const handleContractTypeChange = (type: string, updateDuration = true) => {
    setContractType(type);
    if (updateDuration) {
      // ✅ Updated to match the client's requested durations
      if (type === "individual") setContractDuration(12);
      else if (type === "professional") setContractDuration(36);
      else if (type === "hotel") setContractDuration(24);
    }
  };
  useEffect(() => {
    const fetchUserTypes = async () => {
      try {
        const res = await fetch(`${VITE_API_URL}/api/customer/user-types`, {
          headers: await getSecureHeaders(),
        });
        const data = await res.json();
        if (data.success) {
          setUserTypes(data.types);

          // Auto-select 'individual' if none is selected (useful for new starts)
          // ONLY if we are NOT hydrating (isInitialHydration.current is true initially)
          if (
            !contractType &&
            data.types.length > 0 &&
            isInitialHydration.current &&
            !navLocation.state?.usr
          ) {
            const defaultType =
              data.types.find((t: any) => t.code === "individual") ||
              data.types[0];
            handleContractTypeChange(defaultType.code, true);
          }
        }
      } catch (err) {
        console.error("Failed to load user types:", err);
      } finally {
        setIsLoadingTypes(false);
      }
    };

    fetchUserTypes();
  }, []);

  // Demographics state
  const [owner, setOwner] = useState<OwnerInfo>(emptyOwnerInfo);
  const [manager, setManager] = useState<ManagerInfo>(emptyManagerInfo);
  const [financialManager, setFinancialManager] =
    useState<FinancialManagerInfo>(emptyFinancialManagerInfo);
  const [delivery, setDelivery] = useState<DeliveryInfo>(emptyDeliveryInfo);

  // Copy state management
  const [managerCopyFromOwner, setManagerCopyFromOwner] = useState(false);
  const [financialManagerCopyFromOwner, setFinancialManagerCopyFromOwner] =
    useState(false);
  const [deliveryCopyFromOwner, setDeliveryCopyFromOwner] = useState(false);

  // Approver flow state
  const [showSenderDialog, setShowSenderDialog] = useState(false);
  const [showSenderDialogSend, setShowSenderDialogSend] = useState(false);
  const [confirmedSenderName, setConfirmedSenderName] = useState("");
  const [confirmedSenderEmail, setConfirmedSenderEmail] = useState("");

  // Plan state
  const [selectedPlan, setSelectedPlan] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<
    Array<{
      id: string;
      name: string;
      price: number;
      quantity: number;
    }>
  >([]);
  const [totalScreens, setTotalScreens] = useState(1);
  const [planQuantity, setPlanQuantity] = useState(1);
  const [contractDuration, setContractDuration] = useState(12);
  const [contractType, setContractType] = useState("individual");
  const [includeLegalPackage, setIncludeLegalPackage] = useState(true);
  const [decoderRental, setDecoderRental] = useState(false);
  const [decoderRentalComment, setDecoderRentalComment] = useState("");
  const [decoderPurchaseComment, setDecoderPurchaseComment] = useState("");
  const [planComment, setPlanComment] = useState("");
  const [addonComments, setAddonComments] = useState<Record<string, string>>(
    {}
  );
  const [additionalScreensComment, setAdditionalScreensComment] = useState("");
  const [customItemName, setCustomItemName] = useState("");
  const [customItemPrice, setCustomItemPrice] = useState(0);
  const [autrePoncText, setAutrePoncText] = useState("");
  const [autrePoncCost, setAutrePoncCost] = useState(0);
  const [addSepaMandate, setAddSepaMandate] = useState(false);
  const [addCcAuthorization, setAddCcAuthorization] = useState(false);

  // SEPA Mandate state
  const [sepaData, setSepaData] = useState({
    firstName: "",
    lastName: "",
    companyName: "",
    address: "",
    postalCode: "",
    city: "",
    country: "",
    iban: "",
    bic: "",
    paymentRecurrent: true,
    paymentPonctuel: true,
    rum: "",
    contractReference: "",
  });

  const [availableFees, setAvailableFees] = useState<any[]>([]);
  const [selectedFees, setSelectedFees] = useState<
    { id: string; name: string; price: number }[]
  >([]);

  // Hardware state
  const [decoderHardwareEnabled, setDecoderHardwareEnabled] = useState(false);
  const [decoderUnitPrice, setDecoderUnitPrice] = useState(499);
  const [decoderHardwareCost, setDecoderHardwareCost] = useState(0);
  const [otherHardwareEnabled, setOtherHardwareEnabled] = useState(false);
  const [otherHardwareName, setOtherHardwareName] = useState("");
  const [otherHardwareCost, setOtherHardwareCost] = useState(0);
  const [otherHardware2Enabled, setOtherHardware2Enabled] = useState(false);
  const [otherHardware2Name, setOtherHardware2Name] = useState("");
  const [otherHardware2Cost, setOtherHardware2Cost] = useState(0);

  // Comment collapsible states
  const [isDecoderPurchaseCommentOpen, setIsDecoderPurchaseCommentOpen] =
    useState(false);
  const [isConnectionFeeCommentOpen, setIsConnectionFeeCommentOpen] =
    useState(false);
  const [isInstallFeeCommentOpen, setIsInstallFeeCommentOpen] = useState(false);

  // Tech Services comment state
  const [connectionFeeComment, setConnectionFeeComment] = useState("");
  const [installFeeComment, setInstallFeeComment] = useState("");

  // Reset all form data
  const resetForm = () => {
    setCurrentStep(1);
    setLocation("");
    setOwner(emptyOwnerInfo);
    setManager(emptyManagerInfo);
    setFinancialManager(emptyFinancialManagerInfo);
    setDelivery(emptyDeliveryInfo);
    setManagerCopyFromOwner(false);
    setFinancialManagerCopyFromOwner(false);
    setDeliveryCopyFromOwner(false);
    setShowSenderDialog(false);
    setShowSenderDialogSend(false);
    setConfirmedSenderName("");
    setConfirmedSenderEmail("");
    setSelectedPlan("");
    setSelectedAddons([]);
    setTotalScreens(1);
    setPlanQuantity(1);
    setContractDuration(12);
    setContractType("individual");
    setIncludeLegalPackage(true);
    setDecoderRental(false);
    setDecoderRentalComment("");
    setDecoderPurchaseComment("");
    setAdditionalScreensComment("");
    setCustomItemName("");
    setCustomItemPrice(0);
    setAutrePoncText("");
    setAutrePoncCost(0);
    setAddSepaMandate(false);
    setAddCcAuthorization(false);
    setSepaData({
      firstName: "",
      lastName: "",
      companyName: "",
      address: "",
      postalCode: "",
      city: "",
      country: "",
      iban: "",
      bic: "",
      paymentRecurrent: true,
      paymentPonctuel: true,
      rum: "",
      contractReference: "",
    });
    setSelectedFees([]);
    setDecoderHardwareEnabled(false);
    setDecoderUnitPrice(499);
    setDecoderHardwareCost(0);
    setOtherHardwareEnabled(false);
    setOtherHardwareName("");
    setOtherHardwareCost(0);
    setOtherHardware2Enabled(false);
    setOtherHardware2Name("");
    setOtherHardware2Cost(0);
  };

  const handlePlanChange = (plan: string) => {
    setSelectedPlan(plan);
  };
  // --- FETCH DYNAMIC DECODERS ---
  useEffect(() => {
    const fetchDecoders = async () => {
      // Safely extract IDs for the URL parameters
      const locId =
        typeof location === "object" && location !== null
          ? (location as any).id
          : location;
      const planId =
        (selectedPlan as any) && typeof selectedPlan === "object"
          ? (selectedPlan as any).id
          : selectedPlan;

      if (!locId || !planId) {
        setAvailableDecoders([]);
        if (!isInitialHydration.current) {
          setSelectedDecoders([]); // Reset selection if package changes
        }
        return;
      }

      setIsLoadingDecoders(true);
      try {
        const headers = await getSecureHeaders();
        const res = await fetch(
          `${VITE_API_URL}/api/admin/options/${planId}/${locId}`,
          { headers }
        );
        const data = await res.json();

        if (data.success && Array.isArray(data.rows)) {
          // SPLIT THE DATA BY CATEGORY
          const decs = data.rows.filter((r) => r.category === "decoder");
          const fees = data.rows.filter((r) => r.category === "fee");

          setAvailableDecoders(decs);
          setAvailableFees(fees);

          // 🚀 AUTO-CHECK FEES (Unless we are loading a saved draft)
          if (!isInitialHydration.current) {
            setSelectedFees(
              fees.map((fee) => ({
                id: fee.id,
                name: fee.name,
                price: Number(fee.upfront_price) || 0,
              }))
            );
          }
        }
      } catch (err) {
        console.error("Failed to load decoder options:", err);
      } finally {
        setIsLoadingDecoders(false);
      }
    };
    fetchDecoders();
  }, [selectedPlan, location]);

  // --- FETCH AVAILABLE FLEX CHANNELS & LIMIT FOR SALES APP ---
  useEffect(() => {
    const fetchFlexInfo = async (validPlanId: number) => {
      // 🚨 FIX 1: Immediately reset everything to 0 as soon as the plan changes
      // This forces the tab to hide instantly while checking the new package
      setBaseFlexLimit(0);
      setAvailableFlexChannels([]);
      setSelectedFlexChannels([]);
      setExtraFlexEnabled(false);

      try {
        const headers = await getSecureHeaders();
        const res = await fetch(
          `${VITE_API_URL}/api/admin/subscriptions/flex-channels?planId=${validPlanId}`,
          { headers }
        );
        const data = await res.json();

        if (data.success) {
          setBaseFlexLimit(data.flexLimit || 0);
          setAvailableFlexChannels(data.channels || []);
        } else {
          setBaseFlexLimit(0);
          setAvailableFlexChannels([]);
        }
      } catch (err) {
        console.error("Failed to load flex channels:", err);
        // 🚨 FIX 2: Ensure we reset to 0 if the API call fails or the package has no flex config
        setBaseFlexLimit(0);
        setAvailableFlexChannels([]);
      }
    };

    const planId =
      (selectedPlan as any) && typeof selectedPlan === "object"
        ? (selectedPlan as any).id
        : selectedPlan;

    // ALWAYS fetch if a plan is selected so the backend can tell us the limit
    if (planId) {
      fetchFlexInfo(planId);
    } else {
      setBaseFlexLimit(0);
      setAvailableFlexChannels([]);
      setSelectedFlexChannels([]);
      setExtraFlexEnabled(false);
    }
  }, [selectedPlan]);

  useEffect(() => {
    const abortedData = navLocation.state?.usr as any;

    if (abortedData) {
      console.log("📂 Hydrating Form from Draft:", abortedData);

      // --- FIX 1: Capture Proposal ID to prevent duplicate drafts ---
      if (abortedData.proposalId || abortedData.id) {
        setCurrentProposalId(abortedData.proposalId || abortedData.id);
      }

      // --- FIX 2: Re-hydrate Location (Object vs String) ---
      if (abortedData.originalLocation || abortedData.location) {
        const sourceLoc = abortedData.originalLocation || abortedData.location;
        const locObj =
          typeof sourceLoc === "string"
            ? {
                id: sourceLoc,
                address: "",
                city: "",
                postalCode: "",
              }
            : sourceLoc;
        setLocation(locObj);
      }

      if (abortedData.owner) setOwner(abortedData.owner);
      setManager(abortedData.manager || emptyManagerInfo);
      setFinancialManager(
        abortedData.financialManager || emptyFinancialManagerInfo
      );
      setDelivery(abortedData.delivery || emptyDeliveryInfo);

      if (abortedData.originalPlan || abortedData.selectedPlan) {
        const sourcePlan = abortedData.originalPlan || abortedData.selectedPlan;
        const planId =
          typeof sourcePlan === "object" ? sourcePlan.id : sourcePlan;
        setSelectedPlan(planId);
      }

      if (abortedData.selectedAddons)
        setSelectedAddons(abortedData.selectedAddons);

      if (abortedData.selectedDecoders)
        setSelectedDecoders(abortedData.selectedDecoders);

      setTotalScreens(abortedData.totalScreens || 1);
      setPlanQuantity(abortedData.planQuantity || 1);
      setContractDuration(abortedData.contractDuration || 12);
      setContractType(abortedData.contractType || "individual");
      setIncludeLegalPackage(abortedData.includeLegalPackage ?? true);

      setPlanComment(abortedData.planComment || "");
      setAddonComments(abortedData.addonComments || {});
      setAdditionalScreensComment(abortedData.additionalScreensComment || "");
      setCustomItemName(abortedData.customItemName || "");
      setCustomItemPrice(abortedData.customItemPrice || 0);
      setAutrePoncText(abortedData.autrePoncText || "");
      setAutrePoncCost(abortedData.autrePoncCost || 0);

      setDecoderRental(abortedData.decoderRental ?? true);
      setDecoderRentalComment(abortedData.decoderRentalComment || "");
      setDecoderPurchaseComment(abortedData.decoderPurchaseComment || "");

      if (abortedData.selectedFees) {
        setSelectedFees(abortedData.selectedFees);
      }

      setDecoderHardwareEnabled(abortedData.decoderHardwareEnabled ?? false);
      setDecoderHardwareCost(abortedData.decoderHardwareCost ?? 0);

      setOtherHardwareEnabled(abortedData.otherHardwareEnabled ?? false);
      setOtherHardwareName(abortedData.otherHardwareName || "");
      setOtherHardwareCost(abortedData.otherHardwareCost ?? 0);

      setOtherHardware2Enabled(abortedData.otherHardware2Enabled ?? false);
      setOtherHardware2Name(abortedData.otherHardware2Name || "");
      setOtherHardware2Cost(abortedData.otherHardware2Cost ?? 0);

      const hasSepa = abortedData.addSepaMandate ?? false;
      setAddSepaMandate(hasSepa);
      setAddCcAuthorization(abortedData.addCcAuthorization ?? false);

      if (abortedData.sepaData) {
        setSepaData(abortedData.sepaData);
      }

      if (abortedData.approverName)
        setConfirmedSenderName(abortedData.approverName);
      if (abortedData.approverEmail)
        setConfirmedSenderEmail(abortedData.approverEmail);

      setCurrentStep(1);

      // Clear the navigation state so we don't re-trigger on accidental refresh
      navigate(navLocation.pathname, { replace: true, state: {} });
    } else {
      if (isInitialHydration.current) {
        const shouldReset = !window.history.state?.usr;
        if (shouldReset) {
          resetForm();
        }
      }
    }
    isInitialHydration.current = false;
  }, [navLocation.state, navigate]);

  const handleLocationChange = (newLoc: any) => {
    // Extract ID from both old and new location (handles object vs string)
    const newId =
      typeof newLoc === "object" && newLoc !== null ? newLoc.id : newLoc;
    const currentId =
      typeof location === "object" && location !== null
        ? (location as any).id
        : location;

    // ⛔ ONLY reset if the location ID is actually DIFFERENT
    if (newId !== currentId) {
      setLocation(newLoc);
      setSelectedPlan("");
      setSelectedAddons([]);
      setTotalScreens(1);
      setPlanQuantity(1);
      setCustomItemName("");
      setCustomItemPrice(0);
      setDecoderRental(false);
      setDecoderRentalComment("");
      setDecoderPurchaseComment("");
    } else {
      // If IDs are the same, just update the object reference
      setLocation(newLoc);
    }
  };

  // --- BUILD DYNAMIC STEPS ---
  const rawSteps = [
    {
      id: "location",
      title: t("steps.location.title"),
      description: t("steps.location.description"),
    },
    {
      id: "demographics",
      title: t("steps.demographics.title"),
      description: t("steps.demographics.description"),
    },
  ];

  if (addSepaMandate) {
    rawSteps.push({
      id: "sepa",
      title: t("sepaStep.title"),
      description: t("sepaStep.description"),
    });
  }

  rawSteps.push({
    id: "subscription",
    title: t("steps.subscription.title"),
    description: t("steps.subscription.description"),
  });

  // ONLY SHOW FLEX CHANNELS IF THE PACKAGE ALLOWS THEM
  if (baseFlexLimit > 0) {
    rawSteps.push({
      id: "flex_channels",
      title: "Flex Channels",
      description: "Select extra channels",
    });
  }

  rawSteps.push(
    {
      id: "hardware",
      title: t("steps.hardwareFees.title"),
      description: t("steps.hardwareFees.description"),
    },
    {
      id: "signature",
      title: t("steps.signature.title"),
      description: t("steps.signature.description"),
    }
  );

  // Map the sequentially correct step numbers
  const steps = rawSteps.map((step, index) => ({
    ...step,
    number: index + 1,
  }));

  const progress = (currentStep / steps.length) * 100;

  const validateStep = (step: number): boolean => {
    const totalDecoderQty = selectedDecoders.reduce(
      (acc, curr) => acc + curr.quantity,
      0
    );

    const validateSubscription = () => {
      if (!selectedPlan) {
        toast({
          title: t("validation.planRequired.title"),
          description: t("validation.planRequired.description"),
          variant: "destructive",
        });
        return false;
      }

      if (customItemPrice && customItemPrice > 0 && !customItemName.trim()) {
        toast({
          title: t("validation.itemNameRequired.title"),
          description: t("validation.itemNameRequired.description"),
          variant: "destructive",
        });
        return false;
      }
      return true;
    };

    const activeStepId = steps.find((s) => s.number === step)?.id;

    switch (activeStepId) {
      case "location":
        if (!location) {
          toast({
            title: t("validation.locationRequired.title"),
            description: t("validation.locationRequired.description"),
            variant: "destructive",
          });
          return false;
        }
        return true;

      case "demographics":
        if (
          !owner.firstName ||
          !owner.lastName ||
          !owner.email ||
          !owner.cellPhone
        ) {
          toast({
            title: t("validation.requiredInfo.title"),
            description: t("validation.requiredInfo.description"),
            variant: "destructive",
          });
          return false;
        }
        if (!isValidPhoneNumber(owner.cellPhone)) {
          toast({
            title: "Invalid Phone Number",
            description:
              "Please select the correct country code and enter a valid mobile number for SMS 2FA.",
            variant: "destructive",
          });
          return false;
        }
        const phoneRegex = /^[\d\s\+\-\(\)]{8,20}$/;
        const digitsOnly = owner.cellPhone.replace(/\D/g, "");
        if (!phoneRegex.test(owner.cellPhone) || digitsOnly.length < 8) {
          toast({
            title: "Invalid Phone Number",
            description:
              "Please enter a valid mobile number (e.g. 690 12 34 56). It is required for SMS verification.",
            variant: "destructive",
          });
          return false;
        }
        if (contractType === "professional") {
          if (
            !financialManager.firstName ||
            !financialManager.lastName ||
            !financialManager.email ||
            !financialManager.cellPhone
          ) {
            toast({
              title: t("validation.financialManagerRequired.title"),
              description: t("validation.financialManagerRequired.description"),
              variant: "destructive",
            });
            return false;
          }
        }
        return true;

      case "sepa":
        if (
          !sepaData.firstName ||
          !sepaData.lastName ||
          !sepaData.companyName ||
          !sepaData.address ||
          !sepaData.city ||
          !sepaData.postalCode ||
          !sepaData.iban ||
          !sepaData.bic
        ) {
          toast({
            title: t("validation.requiredInfo.title", {
              defaultValue: "Missing Information",
            }),
            description: "Please fill in all mandatory SEPA fields.",
            variant: "destructive",
          });
          return false;
        }
        return true;

      case "subscription":
        return validateSubscription();

      case "flex_channels":
        return true; // No hard validation needed to proceed

      case "hardware":
        // Strict match for individual/professional, bypass for hotels
        if (contractType !== "hotel" && totalDecoderQty !== totalScreens) {
          toast({
            title: "Decoder Quantity Mismatch",
            description: `You must assign exactly ${totalScreens} decoder(s) for ${totalScreens} screen(s). You currently have ${totalDecoderQty} selected.`,
            variant: "destructive",
          });
          return false;
        }

        // Hotels just need at least ONE item selected (like a RACK)
        if (contractType === "hotel" && totalDecoderQty === 0) {
          toast({
            title: "Equipment Required",
            description:
              "Please select at least one decoder or RACK configuration for this hotel.",
            variant: "destructive",
          });
          return false;
        }
        return true;
      case "signature":
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length));
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
  };

  const handleSenderConfirm = (senderName: string, senderEmail: string) => {
    setConfirmedSenderName(senderName);
    setConfirmedSenderEmail(senderEmail);
    navigate("/contract-approver", {
      state: buildSubscriptionData(senderName, senderEmail),
      replace: true,
    });
  };

  const handleSendContract_Taylor = () => {
    if (!isAuthorized)
      return toast({
        title: t("validation.staffRequired.title"),
        description: t("validation.staffRequired.description"),
        variant: "destructive",
      });
    if (isAdmin) {
      setShowSenderDialogSend(true);
    } else {
      handleSendContract(
        staffFullName || user?.user_metadata?.full_name || "",
        staffEmail || user?.email || ""
      );
    }
  };

  const handleKioskSignature = () => {
    if (!isAuthorized)
      return toast({
        title: t("validation.staffRequired.title"),
        description: t("validation.staffRequired.description"),
        variant: "destructive",
      });
    navigate("/contract-kiosk", {
      state: buildSubscriptionData(
        staffFullName || user?.user_metadata?.full_name || "",
        staffEmail || user?.email || ""
      ),
      replace: true,
    });
  };

  const handleSendContract = (senderName: string, senderEmail: string) => {
    if (!isAuthorized)
      return toast({
        title: t("validation.staffRequired.title"),
        description: t("validation.staffRequired.description"),
        variant: "destructive",
      });
    navigate("/contract-integration", {
      state: buildSubscriptionData(senderName, senderEmail),
      replace: true,
    });
  };

  const renderStepContent = () => {
    const currentLocationDb = dbLocations.find((l) => l.id == location);
    const locationAddlCost = currentLocationDb?.additional_screen_cost || 0;
    const taxRate = currentLocationDb?.tax_amount || 0;

    let legacyLocationId = "saint-martin";
    const dbLocName = currentLocationDb?.name?.toLowerCase() || "";
    if (dbLocName.includes("barthelemy") || dbLocName.includes("barthélemy")) {
      legacyLocationId = "saint-barthelemy";
    } else if (dbLocName.includes("maarten")) {
      legacyLocationId = "sint-maarten";
    }

    // 🚀 FIX: Automatically detect the rental price from the mapped additional_items!
    // We look for any decoder mapped to this location that has a monthly_price > 0.
    const rentalDecoderItem = availableDecoders.find(
      (d) => Number(d.monthly_price) > 0
    );
    const decoderRentalPrice = rentalDecoderItem
      ? Number(rentalDecoderItem.monthly_price)
      : legacyLocationId === "saint-barthelemy"
      ? 10
      : 6; // Fallback

    // FIX: Using the Step ID instead of the unstable Step Number
    const activeStepId = steps.find((s) => s.number === currentStep)?.id;

    switch (activeStepId) {
      case "location":
        return (
          <div className="space-y-6">
            <div className="mb-6">
              <p className="text-primary text-lg font-bold">
                {t("steps.location.instruction")}
              </p>
            </div>
            <LocationPicker value={location} onChange={handleLocationChange} />

            {/* Subscription Contract Details Card */}
            {location && (
              <Card className="card-professional">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {t("planSelection.contractDetails.title")}
                  </CardTitle>
                  <CardDescription>
                    {t("planSelection.contractDetails.description")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {!isCustomer && (
                      <div className="space-y-4 md:col-span-2">
                        <Label className="text-sm font-medium">
                          {t("planSelection.contractDetails.type")}
                        </Label>
                        {isLoadingTypes ? (
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Loader2 className="animate-spin h-4 w-4" /> Loading
                            types...
                          </div>
                        ) : (
                          <Select
                            value={contractType}
                            onValueChange={(value) =>
                              handleContractTypeChange(value)
                            }
                          >
                            <SelectTrigger id="contract-type">
                              <SelectValue
                                placeholder={t(
                                  "planSelection.contractDetails.selectType"
                                )}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {userTypes.map((type) => (
                                <SelectItem key={type.id} value={type.code}>
                                  {type.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    )}
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="contract-duration">
                        {t("planSelection.contractDetails.duration")}
                      </Label>
                      <Select
                        value={contractDuration.toString()}
                        onValueChange={(v) => setContractDuration(parseInt(v))}
                        disabled
                      >
                        <SelectTrigger id="contract-duration">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12">
                            {t("planSelection.contractDetails.months", {
                              count: 12,
                            })}
                          </SelectItem>
                          <SelectItem value="24">
                            {t("planSelection.contractDetails.months", {
                              count: 24,
                            })}
                          </SelectItem>
                          <SelectItem value="36">
                            {t("planSelection.contractDetails.months", {
                              count: 36,
                            })}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "demographics":
        return (
          <div className="space-y-6">
            {location && (
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline">
                  <MapPin className="h-3 w-3 mr-1" />
                  {t("planSelection.serviceLocation")}:{" "}
                  {dbLocations.find((l) => l.id == location)?.name ||
                    "Selected Region"}
                </Badge>
                <Badge variant="outline">
                  <Package className="h-3 w-3 mr-1" />
                  {t("planSelection.contractDetails.type")}:{" "}
                  {t(`planSelection.contractDetails.${contractType}`, {
                    defaultValue:
                      contractType.charAt(0).toUpperCase() +
                      contractType.slice(1),
                  })}
                </Badge>
              </div>
            )}
            {!isCustomer && (
              <Card className="card-professional">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {t("paymentAuthorization.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="noPaymentAuth"
                      name="paymentAuth"
                      checked={!addSepaMandate && !addCcAuthorization}
                      onChange={() => {
                        setAddSepaMandate(false);
                        setAddCcAuthorization(false);
                      }}
                      className="h-4 w-4 border-border text-primary focus:ring-primary"
                    />
                    <label
                      htmlFor="noPaymentAuth"
                      className="text-sm text-foreground cursor-pointer"
                    >
                      {t("paymentAuthorization.none")}
                    </label>
                  </div>
                  <div className="flex items-start space-x-3">
                    <input
                      type="radio"
                      id="sepaMandate"
                      name="paymentAuth"
                      checked={addSepaMandate}
                      onChange={() => {
                        setAddSepaMandate(true);
                        setAddCcAuthorization(false);
                      }}
                      className="mt-0.5 h-4 w-4 border-border text-primary focus:ring-primary"
                    />
                    <div>
                      <label
                        htmlFor="sepaMandate"
                        className="text-sm font-medium text-foreground cursor-pointer"
                      >
                        {t("paymentAuthorization.sepa")}
                      </label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("sepaMandate.description")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <input
                      type="radio"
                      id="ccAuthorization"
                      name="paymentAuth"
                      checked={addCcAuthorization}
                      onChange={() => {
                        setAddSepaMandate(false);
                        setAddCcAuthorization(true);
                      }}
                      className="mt-0.5 h-4 w-4 border-border text-primary focus:ring-primary"
                    />
                    <div>
                      <label
                        htmlFor="ccAuthorization"
                        className="text-sm font-medium text-foreground cursor-pointer"
                      >
                        {t("paymentAuthorization.ccAuth")}
                      </label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("paymentAuthorization.ccAuthDescription")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="mb-6">
              <p className="text-primary text-lg font-bold">
                {t("demographics.instruction")}
              </p>
            </div>
            <DemographicsSection
              location={location}
              owner={owner}
              manager={manager}
              financialManager={financialManager}
              delivery={delivery}
              onOwnerChange={setOwner}
              onManagerChange={setManager}
              onFinancialManagerChange={setFinancialManager}
              onDeliveryChange={setDelivery}
              managerCopyFromOwner={managerCopyFromOwner}
              financialManagerCopyFromOwner={financialManagerCopyFromOwner}
              deliveryCopyFromOwner={deliveryCopyFromOwner}
              onManagerCopyChange={setManagerCopyFromOwner}
              onFinancialManagerCopyChange={setFinancialManagerCopyFromOwner}
              onDeliveryCopyChange={setDeliveryCopyFromOwner}
              contractType={contractType}
            />
          </div>
        );

      case "sepa":
        return (
          <div className="space-y-6">
            <div className="mb-6">
              <p className="text-primary text-lg font-bold">
                {t("sepaStep.title")}
              </p>
              <p className="text-muted-foreground">
                {t("sepaStep.description")}
              </p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>{t("sepaStep.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!sepaData.firstName && (
                  <div className="hidden">
                    {(() => {
                      setSepaData((prev) => ({
                        ...prev,
                        firstName: owner.firstName,
                        lastName: owner.lastName,
                        companyName: owner.companyName,
                        address: owner.address,
                        postalCode: owner.postalCode,
                        city: owner.city,
                        country: owner.country,
                      }));
                      return null;
                    })()}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sepa-firstName">
                      {t("sepaStep.fields.firstName")}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="sepa-firstName"
                      value={sepaData.firstName}
                      onChange={(e) =>
                        setSepaData((prev) => ({
                          ...prev,
                          firstName: e.target.value,
                        }))
                      }
                      placeholder={t("sepaStep.fields.firstName")}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sepa-lastName">
                      {t("sepaStep.fields.lastName")}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="sepa-lastName"
                      value={sepaData.lastName}
                      onChange={(e) =>
                        setSepaData((prev) => ({
                          ...prev,
                          lastName: e.target.value,
                        }))
                      }
                      placeholder={t("sepaStep.fields.lastName")}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sepa-companyName">
                    {t("sepaStep.fields.companyName")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="sepa-companyName"
                    value={sepaData.companyName}
                    onChange={(e) =>
                      setSepaData((prev) => ({
                        ...prev,
                        companyName: e.target.value,
                      }))
                    }
                    placeholder={t("sepaStep.fields.companyName")}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sepa-address">
                    {t("sepaStep.fields.address")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="sepa-address"
                    value={sepaData.address}
                    onChange={(e) =>
                      setSepaData((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    placeholder={t("sepaStep.fields.address")}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sepa-postalCode">
                      {t("common:forms.postalCode")}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="sepa-postalCode"
                      value={sepaData.postalCode}
                      onChange={(e) =>
                        setSepaData((prev) => ({
                          ...prev,
                          postalCode: e.target.value,
                        }))
                      }
                      placeholder={
                        owner.postalCode || t("common:forms.postalCode")
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sepa-city">
                      {t("common:forms.city")}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="sepa-city"
                      value={sepaData.city}
                      onChange={(e) =>
                        setSepaData((prev) => ({
                          ...prev,
                          city: e.target.value,
                        }))
                      }
                      placeholder={owner.city || t("common:forms.city")}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sepa-country">
                    {t("common:forms.country")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="sepa-country"
                    value={sepaData.country}
                    onChange={(e) =>
                      setSepaData((prev) => ({
                        ...prev,
                        country: e.target.value,
                      }))
                    }
                    placeholder={owner.country || t("common:forms.country")}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sepa-iban">
                      {t("sepaStep.fields.iban")}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="sepa-iban"
                      value={sepaData.iban}
                      onChange={(e) =>
                        setSepaData((prev) => ({
                          ...prev,
                          iban: e.target.value,
                        }))
                      }
                      placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sepa-bic">
                      {t("sepaStep.fields.bic")}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="sepa-bic"
                      value={sepaData.bic}
                      onChange={(e) =>
                        setSepaData((prev) => ({
                          ...prev,
                          bic: e.target.value,
                        }))
                      }
                      placeholder="XXXXXXXX"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sepa-recurrent"
                      checked={sepaData.paymentRecurrent}
                      onCheckedChange={(checked) =>
                        setSepaData((prev) => ({
                          ...prev,
                          paymentRecurrent: checked as boolean,
                        }))
                      }
                    />
                    <Label htmlFor="sepa-recurrent" className="cursor-pointer">
                      {t("sepaStep.fields.paymentRecurrent")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sepa-ponctuel"
                      checked={sepaData.paymentPonctuel}
                      onCheckedChange={(checked) =>
                        setSepaData((prev) => ({
                          ...prev,
                          paymentPonctuel: checked as boolean,
                        }))
                      }
                    />
                    <Label htmlFor="sepa-ponctuel" className="cursor-pointer">
                      {t("sepaStep.fields.paymentPonctuel")}
                    </Label>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sepa-rum">{t("sepaStep.fields.rum")}</Label>
                    <Input
                      id="sepa-rum"
                      value={sepaData.rum}
                      onChange={(e) =>
                        setSepaData((prev) => ({
                          ...prev,
                          rum: e.target.value,
                        }))
                      }
                      placeholder={t("sepaStep.fields.rum")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sepa-contractRef">
                      {t("sepaStep.fields.contractReference")}
                    </Label>
                    <Input
                      id="sepa-contractRef"
                      value={sepaData.contractReference}
                      onChange={(e) =>
                        setSepaData((prev) => ({
                          ...prev,
                          contractReference: e.target.value,
                        }))
                      }
                      placeholder={t("sepaStep.fields.contractReference")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "subscription":
        return (
          <div className="space-y-6">
            <div className="mb-6">
              <p className="text-primary text-lg font-bold">
                {t("planSelection.instruction")}
              </p>
            </div>
            {location && (
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline">
                  <MapPin className="h-3 w-3 mr-1" />{" "}
                  {t("planSelection.serviceLocation")}:{" "}
                  {dbLocations.find((l) => l.id == location)?.name ||
                    "Selected Region"}
                </Badge>
                <Badge variant="outline">
                  <Package className="h-3 w-3 mr-1" />{" "}
                  {t("planSelection.contractDetails.type")}:{" "}
                  {t(`planSelection.contractDetails.${contractType}`, {
                    defaultValue:
                      contractType.charAt(0).toUpperCase() +
                      contractType.slice(1),
                  })}
                </Badge>
              </div>
            )}
            <Card className="relative overflow-visible border-l-4 border-l-orange-500">
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex items-center gap-3 md:min-w-[280px]">
                    <Monitor className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex items-center gap-3">
                      <Label
                        htmlFor="totalScreens"
                        className="text-base font-semibold whitespace-nowrap"
                      >
                        {t("subscription:planSelection.totalScreens.label")}
                      </Label>
                      <div className="relative bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-[2px] shadow-lg">
                        <div className="bg-background rounded-lg p-2">
                          <Input
                            id="totalScreens"
                            type="number"
                            min="1"
                            max="999"
                            value={totalScreens}
                            onChange={(e) => {
                              const screens = Math.max(
                                1,
                                parseInt(e.target.value) || 1
                              );
                              setTotalScreens(screens);
                            }}
                            className="w-16 h-10 text-2xl font-bold border-0 bg-transparent text-center focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-orange-600"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <PlanSelection
              location={location}
              selectedPlan={selectedPlan}
              onPlanChange={handlePlanChange}
              selectedAddons={selectedAddons}
              onAddonsChange={setSelectedAddons}
              totalScreens={totalScreens}
              currencySymbol={currentLocationDb?.currency === "EUR" ? "€" : "$"}
              onTotalScreensChange={setTotalScreens}
              planQuantity={planQuantity}
              onPlanQuantityChange={setPlanQuantity}
              contractDuration={contractDuration}
              onContractDurationChange={setContractDuration}
              contractType={contractType}
              onContractTypeChange={handleContractTypeChange}
              decoderRental={decoderRental}
              onDecoderRentalChange={setDecoderRental}
              decoderRentalComment={decoderRentalComment}
              onDecoderRentalCommentChange={setDecoderRentalComment}
              decoderPurchaseComment={decoderPurchaseComment}
              onDecoderPurchaseCommentChange={setDecoderPurchaseComment}
              planComment={planComment}
              onPlanCommentChange={setPlanComment}
              addonComments={addonComments}
              onAddonCommentsChange={setAddonComments}
              customItemName={customItemName}
              onCustomItemNameChange={setCustomItemName}
              customItemPrice={customItemPrice}
              onCustomItemPriceChange={setCustomItemPrice}
              additionalScreensComment={additionalScreensComment}
              onAdditionalScreensCommentChange={setAdditionalScreensComment}
              locationAddlCost={locationAddlCost}
              maxScreensPerPackage={maxScreensPerPackage}
              taxRate={taxRate}
              decoderRentalPrice={decoderRentalPrice}
              selectedDecoders={selectedDecoders}
              extraFlexCost={
                extraFlexEnabled
                  ? Math.max(0, selectedFlexChannels.length - baseFlexLimit) *
                    flexItemPrice
                  : 0
              }
            />
          </div>
        );

      // ====================================================
      // THIS IS THE MISSING FLEX CHANNELS UI INJECTION
      // ====================================================
      case "flex_channels": {
        // Now using the state directly from the API response
        if (baseFlexLimit === 0) {
          return (
            <div className="space-y-6">
              <div className="mb-6">
                <p className="text-primary text-lg font-bold">
                  Flex Channels Configuration
                </p>
              </div>
              <Card className="card-professional text-center p-8 bg-muted/30 border-dashed">
                <ListVideo className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold">Not Applicable</h3>
                <p className="text-muted-foreground">
                  The selected package does not include Flex Channels.
                </p>
                <Button onClick={nextStep} variant="outline" className="mt-6">
                  Continue to Hardware
                </Button>
              </Card>
            </div>
          );
        }

        const totalFreeFlex = baseFlexLimit; // Multiplier removed
        const currentSelected = selectedFlexChannels.length;
        const extraCount = Math.max(0, currentSelected - totalFreeFlex);

        // 🚀 ADD FILTER LOGIC HERE 🚀
        const filteredFlexChannels = availableFlexChannels.filter((channel) =>
          channel.name.toLowerCase().includes(flexSearchQuery.toLowerCase())
        );

        // ... (Keep the rest of the return UI block exactly the same)
        return (
          <div className="space-y-6">
            <div className="mb-6">
              <p className="text-primary text-lg font-bold">
                Configure Flex Channels
              </p>
            </div>

            <Card className="card-professional border-primary/20">
              <CardHeader className="bg-primary/5 pb-4 border-b border-primary/10">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ListVideo className="h-5 w-5 text-primary" /> Included
                      with Package
                    </CardTitle>
                    <CardDescription className="mt-1 text-base">
                      You are allowed{" "}
                      <strong>{totalFreeFlex} total free flex channels</strong>{" "}
                      with this subscription.
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        currentSelected > totalFreeFlex
                          ? "destructive"
                          : "default"
                      }
                      className="text-lg py-1 px-3"
                    >
                      {currentSelected} / {totalFreeFlex} Selected
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                <div className="flex items-start space-x-3 p-4 bg-orange-50 border border-orange-200 rounded-lg mb-6">
                  <Checkbox
                    id="extra-flex"
                    checked={extraFlexEnabled}
                    onCheckedChange={(checked) => {
                      setExtraFlexEnabled(checked as boolean);
                      if (!checked && currentSelected > totalFreeFlex) {
                        setSelectedFlexChannels((prev) =>
                          prev.slice(0, totalFreeFlex)
                        );
                      }
                    }}
                  />
                  <div>
                    <Label
                      htmlFor="extra-flex"
                      className="text-base font-bold text-orange-900 cursor-pointer"
                    >
                      Add Extra Flex Channels (+{" "}
                      {currentLocationDb?.currency === "EUR" ? "€" : "$"}
                      {flexItemPrice.toFixed(2)}/mo each)
                    </Label>
                    <p className="text-sm text-orange-800/80 mt-1">
                      Check this box if the client wishes to select more
                      channels than the package allows.
                    </p>
                    {extraFlexEnabled && extraCount > 0 && (
                      <Badge className="mt-2 bg-orange-500">
                        {extraCount} Extra Channel(s) = +
                        {currentLocationDb?.currency === "EUR" ? "€" : "$"}
                        {(extraCount * flexItemPrice).toFixed(2)}/mo
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search channels..."
                    value={flexSearchQuery}
                    onChange={(e) => setFlexSearchQuery(e.target.value)}
                    className="pl-9 max-w-md text-foreground bg-background"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {filteredFlexChannels.map((channel) => {
                    const isSelected = selectedFlexChannels.includes(
                      channel.id
                    );
                    const isLockedOut =
                      !isSelected &&
                      !extraFlexEnabled &&
                      currentSelected >= totalFreeFlex;

                    return (
                      <div
                        key={channel.id}
                        onClick={() => {
                          if (isLockedOut) return;
                          setSelectedFlexChannels((prev) =>
                            prev.includes(channel.id)
                              ? prev.filter((id) => id !== channel.id)
                              : [...prev, channel.id]
                          );
                        }}
                        className={`
 relative flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-200
 ${
   isLockedOut
     ? "opacity-50 cursor-not-allowed bg-muted/50"
     : "cursor-pointer hover:border-primary/50"
 }
 ${
   isSelected
     ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
     : "border-border"
 }`}
                      >
                        {isSelected && (
                          <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-primary" />
                        )}
                        <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center mb-2 overflow-hidden shadow-sm">
                          {channel.logo_url ? (
                            <img
                              src={channel.logo_url}
                              alt={channel.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-muted-foreground font-semibold">
                              {channel.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <span className="text-center font-medium text-xs truncate w-full px-1">
                          {channel.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }

      case "hardware":
        return (
          <div className="space-y-6">
            {location && (
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline">
                  <MapPin className="h-3 w-3 mr-1" />{" "}
                  {t("planSelection.serviceLocation")}:{" "}
                  {dbLocations.find((l) => l.id == location)?.name ||
                    "Selected Region"}
                </Badge>
                <Badge variant="outline">
                  <Package className="h-3 w-3 mr-1" />{" "}
                  {t("planSelection.contractDetails.type")}:{" "}
                  {t(`planSelection.contractDetails.${contractType}`, {
                    defaultValue:
                      contractType.charAt(0).toUpperCase() +
                      contractType.slice(1),
                  })}
                </Badge>
              </div>
            )}
            <div className="mb-6">
              <p className="text-primary text-lg font-bold">
                {t("hardware.instruction")}
              </p>
            </div>
            <Card className="card-professional">
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Monitor className="h-5 w-5 text-primary" />{" "}
                  <span>{t("hardware.title")}</span>
                </CardTitle>
                <CardDescription>{t("hardware.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Label className="text-base font-semibold">
                    Select Decoders{" "}
                    {contractType === "hotel"
                      ? "(Select at least 1 RACK/Decoder)"
                      : `(Required: ${totalScreens})`}
                  </Label>
                  {isLoadingDecoders ? (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading
                      valid decoders...
                    </div>
                  ) : availableDecoders.length === 0 ? (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Configuration Error</AlertTitle>
                      <AlertDescription>
                        No decoders available for this plan/region.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="grid gap-3">
                      {availableDecoders.map((decoder) => {
                        const selected = selectedDecoders.find(
                          (d) => d.id === decoder.id
                        );
                        const qty = selected ? selected.quantity : 0;
                        const currentTotalSelected = selectedDecoders.reduce(
                          (acc, curr) => acc + curr.quantity,
                          0
                        );

                        return (
                          <div
                            key={decoder.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-background shadow-sm"
                          >
                            <div className="mb-3 sm:mb-0">
                              <p className="font-semibold text-foreground">
                                {decoder.name}
                              </p>
                              <p className="text-xs text-muted-foreground mb-2">
                                {decoder.description}
                              </p>
                              <div className="flex gap-2">
                                {Number(decoder.upfront_price) > 0 && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-orange-100 text-orange-800"
                                  >
                                    Upfront:{" "}
                                    {currentLocationDb?.currency === "EUR"
                                      ? "€"
                                      : "$"}
                                    {decoder.upfront_price}
                                  </Badge>
                                )}
                                {Number(decoder.monthly_price) > 0 && (
                                  <Badge
                                    variant="outline"
                                    className="border-blue-200 text-blue-700"
                                  >
                                    Monthly:{" "}
                                    {currentLocationDb?.currency === "EUR"
                                      ? "€"
                                      : "$"}
                                    {decoder.monthly_price}/mo
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-4 bg-muted/50 p-2 rounded-md">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={() =>
                                  handleDecoderQuantityChange(decoder, qty - 1)
                                }
                                disabled={qty === 0}
                              >
                                -
                              </Button>
                              <span className="w-6 text-center font-bold text-lg">
                                {qty}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={() =>
                                  handleDecoderQuantityChange(decoder, qty + 1)
                                }
                                disabled={
                                  contractType !== "hotel" &&
                                  currentTotalSelected >= totalScreens
                                }
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="card-professional">
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Wrench className="h-5 w-5 text-primary" />{" "}
                  <span>{t("techServices.title")}</span>
                </CardTitle>
                <CardDescription>
                  {t("techServices.description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {availableFees.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No additional fees configured for this region.
                    </p>
                  ) : (
                    availableFees.map((fee) => {
                      const selected = selectedFees.find(
                        (f) => f.id === fee.id
                      );
                      const isEnabled = !!selected;
                      const currentPrice = selected
                        ? selected.price
                        : Number(fee.upfront_price);

                      return (
                        <div
                          className="flex items-start space-x-3"
                          key={fee.id}
                        >
                          <Checkbox
                            checked={isEnabled}
                            disabled={isCustomer}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedFees((prev) => [
                                  ...prev,
                                  {
                                    id: fee.id,
                                    name: fee.name,
                                    price: Number(fee.upfront_price),
                                  },
                                ]);
                              } else {
                                setSelectedFees((prev) =>
                                  prev.filter((f) => f.id !== fee.id)
                                );
                              }
                            }}
                          />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Label className="text-base">{fee.name}</Label>

                              {/* Upfront Price Badge - Added pointer-events-none */}
                              {Number(fee.upfront_price) > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="bg-slate-100 text-slate-700 pointer-events-none"
                                >
                                  {currentLocationDb?.currency === "EUR"
                                    ? "€"
                                    : "$"}
                                  {Number(fee.upfront_price).toFixed(2)}
                                </Badge>
                              )}

                              {/* Monthly Price Badge - Added pointer-events-none */}
                              {Number(fee.monthly_price) > 0 && (
                                <Badge
                                  variant="outline"
                                  className="border-blue-200 text-blue-700 pointer-events-none"
                                >
                                  {currentLocationDb?.currency === "EUR"
                                    ? "€"
                                    : "$"}
                                  {Number(fee.monthly_price).toFixed(2)}/mo
                                </Badge>
                              )}
                            </div>

                            {/* Only show the editable input for Staff, hide for Customers */}
                            {isEnabled && !isCustomer && (
                              <Input
                                type="number"
                                step="0.5"
                                value={
                                  currentPrice === 0 ? 0 : currentPrice || ""
                                }
                                onChange={(e) => {
                                  const newPrice =
                                    parseFloat(e.target.value) || 0;
                                  setSelectedFees((prev) =>
                                    prev.map((f) =>
                                      f.id === fee.id
                                        ? { ...f, price: newPrice }
                                        : f
                                    )
                                  );
                                }}
                                className="w-32 mt-2"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
            {!isCustomer && (
              <Card className="card-professional mt-4">
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center w-full p-4 text-base font-semibold text-foreground hover:bg-muted/50 transition-colors">
                    <ChevronDown className="h-5 w-5 mr-2 text-muted-foreground" />
                    Additional item (optional)
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 pb-4">
                    <div className="flex flex-col sm:flex-row gap-4 pt-2">
                      <Input
                        placeholder="Item description..."
                        value={autrePoncText}
                        onChange={(e) => setAutrePoncText(e.target.value)}
                        className="flex-[2]"
                      />
                      <div className="relative flex-1 sm:max-w-[200px]">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                          {currentLocationDb?.currency === "EUR" ? "€" : "$"}
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={autrePoncCost || ""}
                          onChange={(e) =>
                            setAutrePoncCost(parseFloat(e.target.value) || 0)
                          }
                          className="pl-8"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )}
          </div>
        );

      case "signature":
        return (
          <div className="space-y-6">
            {location && (
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline">
                  <MapPin className="h-3 w-3 mr-1" />{" "}
                  {t("planSelection.serviceLocation")}:{" "}
                  {dbLocations.find((l) => l.id == location)?.name ||
                    "Selected Region"}
                </Badge>
                <Badge variant="outline">
                  <Package className="h-3 w-3 mr-1" />{" "}
                  {t("planSelection.contractDetails.type")}:{" "}
                  {t(`planSelection.contractDetails.${contractType}`, {
                    defaultValue:
                      contractType.charAt(0).toUpperCase() +
                      contractType.slice(1),
                  })}
                </Badge>
              </div>
            )}
            <div className="mb-6">
              <p className="text-primary text-lg font-bold">
                {t("signatureConfirmation.title")}
              </p>
            </div>
            <Card className="card-professional mb-6">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3 mb-4">
                  <input
                    type="checkbox"
                    id="legalPackage"
                    checked={includeLegalPackage}
                    onChange={(e) => setIncludeLegalPackage(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div>
                    <label
                      htmlFor="legalPackage"
                      className="font-medium text-foreground cursor-pointer text-base"
                    >
                      {t("legalPackage.title")}
                    </label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("legalPackage.description")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isCustomer ? (
              <div className="text-center p-8 bg-muted rounded-lg border border-border mt-6">
                <h3 className="text-xl font-bold mb-4">
                  Finalize Your Subscription
                </h3>
                <p className="text-muted-foreground mb-6">
                  Click below to generate your contract. It will be sent to{" "}
                  <strong>{user?.email || owner.email}</strong> for your
                  electronic signature.
                </p>
                <Button
                  size="lg"
                  className="btn-professional"
                  onClick={() => handleInitiateSubmission("customer")}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  ) : (
                    <FileText className="mr-2 h-5 w-5" />
                  )}
                  {isSaving ? "Generating..." : "Generate & Send Contract"}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="card-professional group hover:scale-105 transition-all duration-200 border-primary/50">
                  <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                      <Tablet className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl">Sign on iPad</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-muted-foreground mb-6">
                      Open the contract immediately on this device for in-person
                      signature.
                    </p>
                    <Button
                      onClick={() => handleInitiateSubmission("kiosk")}
                      className="w-full btn-professional"
                    >
                      <Tablet className="mr-2 h-4 w-4" /> Open Kiosk Mode
                    </Button>
                  </CardContent>
                </Card>

                <Card className="card-professional group hover:scale-105 transition-all duration-200">
                  <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                      <FileText className="h-8 w-8 text-success" />
                    </div>
                    <CardTitle className="text-xl">
                      {t("signatureOptions.sendContract.title")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-muted-foreground mb-6">
                      {t("signatureOptions.sendContract.description")}
                    </p>
                    <Button
                      onClick={() => handleInitiateSubmission("send")}
                      variant="outline"
                      className="w-full border-success text-success hover:bg-success hover:text-white"
                    >
                      <FileText className="mr-2 h-4 w-4" />{" "}
                      {t("signatureOptions.sendContract.button")}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            <SenderConfirmationDialog
              open={showSenderDialogSend}
              onOpenChange={setShowSenderDialogSend}
              onConfirm={handleSendContract}
              defaultName={
                staffFullName || user?.user_metadata?.full_name || ""
              }
              defaultEmail={staffEmail || user?.email || ""}
            />
            <SenderConfirmationDialog
              open={showSenderDialog}
              onOpenChange={setShowSenderDialog}
              onConfirm={handleSenderConfirm}
              defaultName={
                staffFullName || user?.user_metadata?.full_name || ""
              }
              defaultEmail={staffEmail || user?.email || ""}
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (staffLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t("progress.loadingStaff")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
            <div className="text-sm text-muted-foreground">
              {t("progress.step", {
                current: currentStep,
                total: steps.length,
              })}
            </div>
          </div>

          <Progress value={progress} className="mb-6" />

          <div className="grid grid-cols-5 gap-4">
            {steps.map((step) => (
              <div
                key={step.number}
                className={`text-center p-3 rounded-lg border transition-all duration-200 ${
                  step.number === currentStep
                    ? "border-primary bg-primary/5"
                    : step.number < currentStep
                    ? "border-success bg-success/5"
                    : "border-border bg-muted/30"
                }`}
              >
                <div
                  className={`text-lg font-bold ${
                    step.number === currentStep
                      ? "text-primary"
                      : step.number < currentStep
                      ? "text-success"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.number}
                </div>
                <div className="text-sm font-medium text-foreground">
                  {step.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {step.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-8">{renderStepContent()}</div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t("common:buttons.previous")}</span>
          </Button>
          {isCustomer && currentStep < steps.length && (
            <Button
              variant="secondary"
              onClick={handleSaveProgress}
              disabled={isSaving}
              className="bg-muted-foreground/20 hover:bg-muted-foreground/30"
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
              ) : null}
              {isSaving ? "Saving..." : "Save Progress"}
            </Button>
          )}
          {currentStep < steps.length ? (
            <Button
              onClick={nextStep}
              className="btn-professional flex items-center space-x-2"
              disabled={
                steps.find((s) => s.number === currentStep)?.id ===
                  "hardware" && availableDecoders.length === 0
              }
            >
              <span>{t("common:buttons.next")}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => setCurrentStep(1)}
              className="flex items-center space-x-2"
            >
              <span>{t("navigation.startNew")}</span>
            </Button>
          )}
        </div>
      </div>
      {/* NICKNAME MODAL */}
      <NicknameModal
        isOpen={showNicknameModal}
        onClose={() => setShowNicknameModal(false)}
        onConfirm={handleNicknameConfirmed}
        userEmail={owner.email} // 🚀 FIX: Strictly use the subscriber's email
      />
      {/* DUPLICATE WARNING MODAL */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-card border border-amber-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-amber-500">
              <AlertTriangle size={28} />
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
                  handleSubmitCustomer(true); // Re-fire with forceDuplicate = true
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
export default NewSubscription;
