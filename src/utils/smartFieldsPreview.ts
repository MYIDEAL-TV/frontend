// Utility to build Smart Fields payload preview
// Mirrors the edge function's field mapping logic for frontend debugging

export interface OwnerInfo {
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

export interface ManagerInfo {
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string;
  companyName?: string;
  address: string;
  city: string;
  postalCode: string;
}

export interface FinancialManagerInfo {
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string;
  landlinePhone?: string;
}

export interface DeliveryInfo {
  address: string;
  city: string;
  postalCode: string;
  cellPhone: string;
}

export interface ContractData {
  subscriberInfo: OwnerInfo;
  partnerInfo?: ManagerInfo;
  guarantorInfo?: FinancialManagerInfo;
  deliveryInfo?: DeliveryInfo;
  location: {
    id: string;
    address: string;
    city: string;
    postalCode: string;
  };
  selectedPlan: {
    name: string;
    price: number;
  };
  addons: Array<{ name: string; price: number; quantity?: number }>;
  additionalScreens: number;
  planQuantity?: number;
  contractType?: string;
  sendMethod?: "embed" | "email" | "sms";
  authenticationMethod?: "password" | "sms" | "none";
  customItemName?: string;
  customItemPrice?: number;
  autrePoncText?: string;
  autrePoncCost?: number;
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
  decoderRental?: boolean;
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
  taxAmount?: number;
}

export interface FieldCategory {
  name: string;
  fields: Array<{
    key: string;
    value: string;
    isFilled: boolean;
  }>;
}

export interface SmartFieldsPreview {
  payload: {
    data: Array<Record<string, string>>;
    client_timestamp: number;
  };
  metadata: {
    totalFields: number;
    filledFields: number;
    categories: FieldCategory[];
  };
}

// Calculate costs based on location and contract type
function calculateCosts(contractData: ContractData, customItemPrice: number = 0) {
  const locationId = contractData.location.id.toLowerCase();
  const planPrice = contractData.selectedPlan?.price || 0;
  const planQty = contractData.planQuantity || 1;
  const additionalScreens = contractData.additionalScreens || 0;

  // 1. Dynamic Add-ons Total
  let totalAddonCost = 0;
  if (contractData.addons && contractData.addons.length > 0) {
    contractData.addons.forEach((addon) => {
      totalAddonCost += (addon.price || 0) * planQty;
    });
  }

  // 2. Decoder Rental
  const rentalPrice = locationId === "saint-barthelemy" ? 10.0 : 6.0;
  const totalScreens = planQty + additionalScreens;
  const rentalCost = contractData.decoderRental
    ? rentalPrice * totalScreens
    : 0;

  // 3. Additional Screens
  const screenPrice = locationId === "saint-barthelemy" ? 20.0 : 10.0;
  const additionalScreensCost = additionalScreens * screenPrice;

  // 4. Base Plan
  const planTotal = planPrice * planQty;

  // 5. Calculate Grand Totals
  const Tot_HT =
    planTotal +
    rentalCost +
    additionalScreensCost +
    totalAddonCost +
    customItemPrice;

  // DYNAMIC TAX LOGIC
  const taxRate =
    contractData.taxAmount !== undefined
      ? Number(contractData.taxAmount)
      : locationId === "saint-martin"
      ? 0.04
      : 0;

  const Tot_Taxes = Tot_HT * taxRate;
  const Tot_Mensuel = Tot_HT + Tot_Taxes;

  return {
    Tot_HT: Tot_HT.toFixed(2),
    Tot_Taxes: Tot_Taxes.toFixed(2),
    Tot_Mensuel: Tot_Mensuel.toFixed(2),
    Tot_Recurring_Cost: Tot_Mensuel.toFixed(2),
  };
}

function calculatePoncCosts(
  contractData: ContractData,
  Autre_Ponc_Price: number = 0
): Record<string, string> {
  const Connection_Cost = (contractData.connectionFeeCost || 0).toFixed(2);
  const Install_Cost = (contractData.installFeeCost || 0).toFixed(2);
  const DecodBuy_Cost = (contractData.decoderHardwareCost || 0).toFixed(2);
  const Dish_Cost = (contractData.satelliteDishCost || 0).toFixed(2);
  const OtherEquipment_Cost = (contractData.otherHardwareCost || 0).toFixed(2);
  const OtherEquipment2_Cost = (contractData.otherHardware2Cost || 0).toFixed(2);

  // Subtotal (Hors Taxe)
  const Tot_HT_Ponc = (
    parseFloat(Connection_Cost) +
    parseFloat(Install_Cost) +
    parseFloat(DecodBuy_Cost) +
    parseFloat(Dish_Cost) +
    parseFloat(OtherEquipment_Cost) +
    parseFloat(OtherEquipment2_Cost) +
    Autre_Ponc_Price
  ).toFixed(2);

  // DYNAMIC TAX LOGIC
  const locationId = contractData.location.id.toLowerCase();
  const taxRate =
    contractData.taxAmount !== undefined
      ? Number(contractData.taxAmount)
      : locationId === "saint-martin"
      ? 0.04
      : 0;

  const Tot_Taxes_Ponc = (parseFloat(Tot_HT_Ponc) * taxRate).toFixed(2);
  const Tot_Ponc = (parseFloat(Tot_HT_Ponc) * (1 + taxRate)).toFixed(2);

  return {
    Connection_Cost,
    Install_Cost,
    DecodBuy_Cost,
    Dish_Cost,
    OtherEquipment_Cost,
    OtherEquipment2_Cost,
    Tot_HT_Ponc,
    Tot_Taxes_Ponc,
    Tot_Ponc,
  };
}
    case "other":
    default:
      const costMyPlanDefault = hasMyPlan ? 39 : 0;
      const costAllDefault = hasAllPlan ? 59 : 0;
      const costDecDefault = 8;
      const costFamilyDefault = hasFamily ? 6 : 0;
      const costSportDefault = hasSport ? 8 : 0;
      const costCineDefault = hasCinema ? 6 : 0;
      const costKidsDefault = hasKids ? 6 : 0;
      const costAddtlScrDefault = additionalScreens * 8;
      const totMensuelDefault =
        costMyPlanDefault +
        costAllDefault +
        costDecDefault +
        costFamilyDefault +
        costSportDefault +
        costCineDefault +
        costKidsDefault +
        costAddtlScrDefault +
        customItemPrice;

      return {
        Cost_MyPlan: costMyPlanDefault.toFixed(2),
        Cost_All: costAllDefault.toFixed(2),
        Cost_Dec: costDecDefault.toFixed(2),
        Cost_Family: costFamilyDefault.toFixed(2),
        Cost_Sport: costSportDefault.toFixed(2),
        Cost_Cine: costCineDefault.toFixed(2),
        Cost_Kids: costKidsDefault.toFixed(2),
        Cost_Addtl_Scr: costAddtlScrDefault.toFixed(2),
        Cost_Autre,
        Tot_Mensuel: totMensuelDefault.toFixed(2),
        Setup_Fee: setupFee.toFixed(2),
        Std_Install: stdInstall.toFixed(2),
      };
  }
}

export function buildSmartFieldsPayload(contractData: ContractData): SmartFieldsPreview {
  // Calculate all costs first
  const costs = calculateCosts(contractData, contractData.customItemPrice || 0);

  // Build the Smart Fields data payload - each field is a separate object in the array
  const smartFieldsData: Array<Record<string, string>> = [
    // Owner (Proprio_*) - from Subscriber
    { Proprio_Nom: `${contractData.subscriberInfo.firstName} ${contractData.subscriberInfo.lastName}` },
    { Proprio_Adresse: contractData.subscriberInfo.address },
    { Proprio_email: contractData.subscriberInfo.email },
    { Proprio_Cell: contractData.subscriberInfo.cellPhone },
    { Proprio_CP: contractData.subscriberInfo.postalCode },
    { Proprio_Ville: contractData.subscriberInfo.city },
    { Proprio_Phone: contractData.subscriberInfo.landlinePhone },

    // Delivery/Installation (Livraison_*) - from Delivery or fallback to Owner
    { Livraison_Adresse: contractData.deliveryInfo?.address || contractData.subscriberInfo.address },
    { Livraison_CP: contractData.deliveryInfo?.postalCode || contractData.subscriberInfo.postalCode },
    { Livraison_Ville: contractData.deliveryInfo?.city || contractData.subscriberInfo.city },
    { Livraison_Cell: contractData.deliveryInfo?.cellPhone || contractData.subscriberInfo.cellPhone },

    // Subscription Details
    { Nb_Ecrans: (contractData.additionalScreens + 1).toString() },
    { Ecrans_Addtl: contractData.additionalScreens.toString() },
    { Dec_Rental: (contractData.additionalScreens + 1).toString() },
  ];

  // Plan selection (handle location-specific IDs)
  const planId = contractData.selectedPlan.name.toLowerCase();
  if (planId.startsWith("basic")) {
    smartFieldsData.push({ SXM_Plan: "1" }, { ALL: "0" });
  } else if (planId.startsWith("full")) {
    smartFieldsData.push({ SXM_Plan: "0" }, { ALL: "1" });
  } else {
    smartFieldsData.push({ SXM_Plan: "0" }, { ALL: "0" });
  }

  // Add Manager (Mgr_*) - from Partner if provided
  if (contractData.partnerInfo?.firstName) {
    smartFieldsData.push(
      { Mgr_Nom: `${contractData.partnerInfo.firstName} ${contractData.partnerInfo.lastName}` },
      { Mgr_Cell: contractData.partnerInfo.cellPhone },
      { Mgr_Adresse: contractData.partnerInfo.address },
      { Mgr_email: contractData.partnerInfo.email },
      { Mgr_CP: contractData.partnerInfo.postalCode },
      { Mgr_Ville: contractData.partnerInfo.city },
    );
  }

  // Add CFO (DAF_*) - from Guarantor if provided
  if (contractData.guarantorInfo?.firstName) {
    smartFieldsData.push(
      { DAF_Nom: `${contractData.guarantorInfo.firstName} ${contractData.guarantorInfo.lastName}` },
      { DAF_Cell: contractData.guarantorInfo.cellPhone },
      { DAF_Phone: contractData.guarantorInfo.landlinePhone },
      { DAF_email: contractData.guarantorInfo.email },
    );
  }

  // Add-on packages (checkboxes: "1" = checked, "0" = unchecked)
  const addonIds = contractData.addons.map((addon) => addon.name.toLowerCase());
  smartFieldsData.push(
    { Sport: addonIds.some((id) => id.includes("sport")) ? "1" : "0" },
    { Family: addonIds.some((id) => id.includes("family")) ? "1" : "0" },
    { Cine: addonIds.some((id) => id.includes("cinema")) ? "1" : "0" },
    { Kids: addonIds.some((id) => id.includes("kids")) ? "1" : "0" },
  );

  // Add calculated costs - only non-zero values (except Tot_Mensuel which should always be included)
  const costEntries = [
    { Cost_MyPlan: costs.Cost_MyPlan },
    { Cost_All: costs.Cost_All },
    { Cost_Dec: costs.Cost_Dec },
    { Cost_Family: costs.Cost_Family },
    { Cost_Sport: costs.Cost_Sport },
    { Cost_Cine: costs.Cost_Cine },
    { Cost_Kids: costs.Cost_Kids },
    { Cost_Addtl_Scr: costs.Cost_Addtl_Scr },
    { Setup_Fee: costs.Setup_Fee },
    { Std_Install: costs.Std_Install },
  ];

  costEntries.forEach((costEntry) => {
    const value = Object.values(costEntry)[0];
    const numericValue = parseFloat(value);
    if (numericValue !== 0) {
      smartFieldsData.push(costEntry);
    }
  });

  // Always include Tot_Mensuel
  smartFieldsData.push({ Tot_Mensuel: costs.Tot_Mensuel });

  // Add custom item fields if provided and non-zero
  if (contractData.customItemName && contractData.customItemPrice !== undefined && contractData.customItemPrice !== 0) {
    smartFieldsData.push(
      { Autre: contractData.customItemName },
      { Cost_Autre: contractData.customItemPrice.toFixed(2) },
    );
  }

  // Add SEPA fields if provided
  if (contractData.sepaData) {
    // Concatenate firstName and lastName for SEPA_Name
    const firstName = contractData.sepaData.firstName;
    const lastName = contractData.sepaData.lastName;
    const fullName = `${firstName} ${lastName}`.trim();

    smartFieldsData.push(
      { SEPA_Name: fullName }, // Concatenated firstName + lastName
      { SEPA_CompanyName: contractData.sepaData.companyName }, // Company name
      { SEPA_Adresse: contractData.sepaData.address },
      { SEPA_CP: contractData.sepaData.postalCode }, // Postal Code
      { SEPA_City: contractData.sepaData.city }, // City
      { SEPA_Country: contractData.sepaData.country }, // Country
      { SEPA_IBAN: contractData.sepaData.iban },
      { SEPA_BIC: contractData.sepaData.bic },
      { SEPA_Recurrent: contractData.sepaData.paymentRecurrent ? "X" : "" },
      { SEPA_Ponctuel: contractData.sepaData.paymentPonctuel ? "X" : "" },
      { SEPA_RUM: contractData.sepaData.rum },
      { SEPA_ContractRef: contractData.sepaData.contractReference },
    );
  }

  // Helper function to find value from field key in array
  const findFieldValue = (key: string): string => {
    const field = smartFieldsData.find((obj) => obj.hasOwnProperty(key));
    return field?.[key] || "";
  };

  // Build categories for display
  const categories: FieldCategory[] = [
    {
      name: "Owner (Proprio)",
      fields: [
        { key: "Proprio_Nom", value: findFieldValue("Proprio_Nom"), isFilled: true },
        { key: "Proprio_Adresse", value: findFieldValue("Proprio_Adresse"), isFilled: true },
        { key: "Proprio_Ville", value: findFieldValue("Proprio_Ville"), isFilled: true },
        { key: "Proprio_CP", value: findFieldValue("Proprio_CP"), isFilled: true },
        { key: "Proprio_email", value: findFieldValue("Proprio_email"), isFilled: true },
        { key: "Proprio_Cell", value: findFieldValue("Proprio_Cell"), isFilled: true },
        { key: "Proprio_Phone", value: findFieldValue("Proprio_Phone"), isFilled: true },
      ],
    },
    {
      name: "Delivery/Installation (Livraison)",
      fields: [
        { key: "Livraison_Adresse", value: findFieldValue("Livraison_Adresse"), isFilled: true },
        { key: "Livraison_Ville", value: findFieldValue("Livraison_Ville"), isFilled: true },
        { key: "Livraison_CP", value: findFieldValue("Livraison_CP"), isFilled: true },
        { key: "Livraison_Cell", value: findFieldValue("Livraison_Cell"), isFilled: true },
      ],
    },
    {
      name: "Subscription Details",
      fields: [
        { key: "Nb_Ecrans", value: findFieldValue("Nb_Ecrans"), isFilled: true },
        { key: "Ecrans_Addtl", value: findFieldValue("Ecrans_Addtl"), isFilled: true },
        { key: "Dec_Rental", value: findFieldValue("Dec_Rental"), isFilled: true },
        { key: "SXM_Plan", value: findFieldValue("SXM_Plan"), isFilled: true },
        { key: "ALL", value: findFieldValue("ALL"), isFilled: true },
      ],
    },
    {
      name: "Add-ons",
      fields: [
        { key: "Sport", value: findFieldValue("Sport"), isFilled: true },
        { key: "Family", value: findFieldValue("Family"), isFilled: true },
        { key: "Cine", value: findFieldValue("Cine"), isFilled: true },
        { key: "Kids", value: findFieldValue("Kids"), isFilled: true },
      ],
    },
    {
      name: "Costs",
      fields: [
        { key: "Cost_MyPlan", value: findFieldValue("Cost_MyPlan"), isFilled: !!findFieldValue("Cost_MyPlan") },
        { key: "Cost_All", value: findFieldValue("Cost_All"), isFilled: !!findFieldValue("Cost_All") },
        { key: "Cost_Dec", value: findFieldValue("Cost_Dec"), isFilled: !!findFieldValue("Cost_Dec") },
        { key: "Cost_Family", value: findFieldValue("Cost_Family"), isFilled: !!findFieldValue("Cost_Family") },
        { key: "Cost_Sport", value: findFieldValue("Cost_Sport"), isFilled: !!findFieldValue("Cost_Sport") },
        { key: "Cost_Cine", value: findFieldValue("Cost_Cine"), isFilled: !!findFieldValue("Cost_Cine") },
        { key: "Cost_Kids", value: findFieldValue("Cost_Kids"), isFilled: !!findFieldValue("Cost_Kids") },
        {
          key: "Cost_Addtl_Scr",
          value: findFieldValue("Cost_Addtl_Scr"),
          isFilled: !!findFieldValue("Cost_Addtl_Scr"),
        },
        { key: "Cost_Autre", value: findFieldValue("Cost_Autre"), isFilled: !!findFieldValue("Cost_Autre") },
        { key: "Tot_Mensuel", value: findFieldValue("Tot_Mensuel"), isFilled: !!findFieldValue("Tot_Mensuel") },
        { key: "Setup_Fee", value: findFieldValue("Setup_Fee"), isFilled: !!findFieldValue("Setup_Fee") },
        { key: "Std_Install", value: findFieldValue("Std_Install"), isFilled: !!findFieldValue("Std_Install") },
      ],
    },
  ];

  // Add Manager category if data exists
  if (findFieldValue("Mgr_Nom")) {
    categories.push({
      name: "Manager (Mgr)",
      fields: [
        { key: "Mgr_Nom", value: findFieldValue("Mgr_Nom"), isFilled: true },
        { key: "Mgr_Adresse", value: findFieldValue("Mgr_Adresse"), isFilled: true },
        { key: "Mgr_Ville", value: findFieldValue("Mgr_Ville"), isFilled: true },
        { key: "Mgr_CP", value: findFieldValue("Mgr_CP"), isFilled: true },
        { key: "Mgr_email", value: findFieldValue("Mgr_email"), isFilled: true },
        { key: "Mgr_Cell", value: findFieldValue("Mgr_Cell"), isFilled: true },
      ],
    });
  }

  // Add CFO category if data exists
  if (findFieldValue("DAF_Nom")) {
    categories.push({
      name: "CFO (DAF)",
      fields: [
        { key: "DAF_Nom", value: findFieldValue("DAF_Nom"), isFilled: true },
        { key: "DAF_email", value: findFieldValue("DAF_email"), isFilled: true },
        { key: "DAF_Cell", value: findFieldValue("DAF_Cell"), isFilled: true },
        { key: "DAF_Phone", value: findFieldValue("DAF_Phone"), isFilled: true },
      ],
    });
  }

  // Add SEPA category if data exists
  if (contractData.sepaData) {
    const fullName = `${contractData.sepaData.firstName} ${contractData.sepaData.lastName}`.trim();

    categories.push({
      name: "SEPA Mandate",
      fields: [
        { key: "SEPA_Name", value: findFieldValue("SEPA_Name") || fullName, isFilled: true },
        { key: "SEPA_CompanyName", value: findFieldValue("SEPA_CompanyName"), isFilled: true },
        { key: "SEPA_Adresse", value: findFieldValue("SEPA_Adresse"), isFilled: true },
        { key: "SEPA_CP", value: findFieldValue("SEPA_CP"), isFilled: true },
        { key: "SEPA_City", value: findFieldValue("SEPA_City"), isFilled: true },
        { key: "SEPA_Country", value: findFieldValue("SEPA_Country"), isFilled: true },
        { key: "SEPA_IBAN", value: findFieldValue("SEPA_IBAN"), isFilled: true },
        { key: "SEPA_BIC", value: findFieldValue("SEPA_BIC"), isFilled: true },
        { key: "SEPA_Recurrent", value: findFieldValue("SEPA_Recurrent"), isFilled: true },
        { key: "SEPA_Ponctuel", value: findFieldValue("SEPA_Ponctuel"), isFilled: true },
        { key: "SEPA_RUM", value: findFieldValue("SEPA_RUM"), isFilled: true },
        { key: "SEPA_ContractRef", value: findFieldValue("SEPA_ContractRef"), isFilled: true },
      ],
    });
  }

  // Calculate totals
  const totalFields = smartFieldsData.length;
  const filledFields = smartFieldsData.filter((obj) => {
    const value = Object.values(obj)[0];
    return value && value.trim() !== "" && value !== "0";
  }).length;

  return {
    payload: {
      data: smartFieldsData,
      client_timestamp: Date.now(),
    },
    metadata: {
      totalFields,
      filledFields,
      categories,
    },
  };
}
