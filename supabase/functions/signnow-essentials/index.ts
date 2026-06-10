import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContractRequest {
  subscriberInfo: {
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
  };
  partnerInfo?: {
    firstName: string;
    lastName: string;
    email: string;
    cellPhone: string;
    companyName?: string;
    address: string;
    city: string;
    postalCode: string;
  };
  guarantorInfo?: {
    firstName: string;
    lastName: string;
    email: string;
    cellPhone: string;
    landlinePhone?: string;
  };
  deliveryInfo?: {
    address: string;
    city: string;
    postalCode: string;
    cellPhone: string;
  };
  selectedPlan: {
    name: string;
    price: number;
  };
  addons: Array<{ name: string; price: number; quantity?: number }>;
  location: {
    id: string;
    address: string;
    city: string;
    postalCode: string;
  };
  additionalScreens: number;
  planQuantity?: number;
  decoderOption?: "rent" | "buy";
  customItemName?: string;
  customItemPrice?: number;
  autrePoncText?: string;
  autrePoncCost?: number;
  addSepaMandate?: boolean;
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
  sendMethod?: "embed" | "email" | "sms";
  authenticationMethod?: "password" | "sms" | "none";
  includeLegalPackage?: boolean;
  planInfo?: {
    contractType?: string;
  };
  subscriptionId?: string; // Optional subscription ID for tracking
  frontendUrl?: string; // Base URL of the frontend application
  useApproverFlow?: boolean; // NEW: flag for approver workflow
  approverName?: string;     // NEW: editable approver name
  approverEmail?: string;    // NEW: editable approver email
}

const SIGNNOW_API_HOST = Deno.env.get("SIGNNOW_API_BASE_URL");
const SIGNNOW_BRAND_ID = Deno.env.get("SIGNNOW_BRAND_ID");

// Function to get access token
async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get("SIGNNOW_CLIENT_ID");
  const clientSecret = Deno.env.get("SIGNNOW_CLIENT_SECRET");
  const userEmail = Deno.env.get("SIGNNOW_USER_EMAIL");
  const userPassword = Deno.env.get("SIGNNOW_USER_PASSWORD");

  if (!clientId || !clientSecret || !userEmail || !userPassword) {
    throw new Error("Missing SignNow configuration");
  }

  const response = await fetch(`${SIGNNOW_API_HOST}/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "password",
      username: userEmail,
      password: userPassword,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Function to select template ID based on location and legal package
function getApproverTemplateId(locationId: string, includeLegal: boolean): string {
  const normalizedLoc = locationId.toUpperCase().replace(/-/g, "_");
  const suffix = includeLegal ? "_WITH_TC" : "_WITHOUT_TC";
  const templateId = Deno.env.get(`SIGNNOW_APPROVER_TEMPLATE_${normalizedLoc}${suffix}`);

  if (!templateId) {
    // Fallback to default if location-specific not found
    const defaultTemplateId = Deno.env.get(`SIGNNOW_APPROVER_TEMPLATE_DEFAULT${suffix}`);
    if (!defaultTemplateId) {
      throw new Error(`No approver template found for ${locationId}${suffix}`);
    }
    console.log(`Using default approver template${suffix}: ${defaultTemplateId}`);
    return defaultTemplateId;
  }

  console.log(`Using approver template for ${locationId}${suffix}: ${templateId}`);
  return templateId;
}

//Calculate Costs
function calculateCosts(contractData: ContractRequest, customItemPrice: number = 0): Record<string, string> {
  const locationId = contractData.location.id;

  // Extract checkbox values (0 or 1) and use the actual plan price sent from frontend
  const planId = contractData.selectedPlan.name.toLowerCase();
  const planPrice = contractData.selectedPlan.price || 0;
  const SXM_Plan = planId.startsWith("basic") ? 1 : 0;
  const ALL = planId.startsWith("full") || planId === "sbh" ? 1 : 0; // Include Saint Barthélemy plan
  const planQty = contractData.planQuantity || 1;
  const additionalScreens = contractData.additionalScreens || 0;
  
  // Calculate total screens correctly
  const totalScreens = planQty + additionalScreens;
  const Dec_Rental = totalScreens;
  const Ecrans_Addtl = additionalScreens;

  // Extract addon quantities from the addons array
  const Sport = contractData.addons.find(a => a.name.toLowerCase().includes("sport"))?.quantity || 0;
  const Family = contractData.addons.find(a => a.name.toLowerCase().includes("family"))?.quantity || 0;
  const Cine = contractData.addons.find(a => a.name.toLowerCase().includes("cine"))?.quantity || 0;
  const Kids = contractData.addons.find(a => a.name.toLowerCase().includes("kids"))?.quantity || 0;

  console.log(`Calculating costs for location: ${locationId}`);
  console.log(`Plan ID: ${planId}, Price: ${planPrice}`);
  console.log(`Plan: SXM_Plan=${SXM_Plan}, ALL=${ALL}, Quantity=${planQty}`);
  console.log(`Screens: Total=${totalScreens}, Dec_Rental=${Dec_Rental}, Ecrans_Addtl=${Ecrans_Addtl}`);
  console.log(`Addons received:`, contractData.addons.map(a => `${a.name}(qty:${a.quantity})`).join(', '));
  console.log(`Addons: Sport=${Sport}, Family=${Family}, Cine=${Cine}, Kids=${Kids}`);
  console.log(`Custom Item Price: ${customItemPrice}`);

  // Format custom item cost - ensure it's a valid number
  const Cost_Autre = (Number(customItemPrice) || 0).toFixed(2);

  // DYNAMIC TAX LOGIC
  const taxRate = locationId === "saint-martin" ? 0.04 : 0;

  // Calculate costs based on location
  switch (locationId) {
    case "saint-barthelemy": {
      const HT_All = ALL * planPrice * planQty;
      const HT_Dec = Dec_Rental * 10;
      const HT_Cine = Cine * 16;
      const HT_Addtl_Scr = Ecrans_Addtl * 20;
      
      const Tot_HT = HT_All + HT_Dec + HT_Cine + HT_Addtl_Scr + customItemPrice;
      const Tot_Taxes = Tot_HT * taxRate;
      const Tot_Mensuel = Tot_HT + Tot_Taxes;

      return { 
        Cost_All: HT_All.toFixed(2), 
        Cost_Dec: HT_Dec.toFixed(2), 
        Cost_Cine: HT_Cine.toFixed(2), 
        Cost_Addtl_Scr: HT_Addtl_Scr.toFixed(2), 
        Cost_Autre,
        Tot_HT: Tot_HT.toFixed(2),
        Tot_Taxes: Tot_Taxes.toFixed(2),
        Tot_Mensuel: Tot_Mensuel.toFixed(2)
      };
    }

    case "saint-martin": {
      const HT_MyPlan = SXM_Plan * planPrice * planQty;
      const HT_All = ALL * planPrice * planQty;
      const HT_Dec = Dec_Rental * 6;
      const HT_Family = Family * 25;
      const HT_Sport = Sport * 25;
      const HT_Cine = Cine * 16;
      const HT_Kids = Kids * 6;
      const HT_Addtl_Scr = Ecrans_Addtl * 10;

      const Tot_HT = HT_MyPlan + HT_All + HT_Dec + HT_Family + HT_Sport + HT_Cine + HT_Kids + HT_Addtl_Scr + customItemPrice;
      const Tot_Taxes = Tot_HT * taxRate;
      const Tot_Mensuel = Tot_HT + Tot_Taxes;

      return {
        Cost_MyPlan: (HT_MyPlan * (1 + taxRate)).toFixed(2), // Legacy fields include tax
        Cost_All: (HT_All * (1 + taxRate)).toFixed(2),
        Cost_Dec: (HT_Dec * (1 + taxRate)).toFixed(2),
        Cost_Family: (HT_Family * (1 + taxRate)).toFixed(2),
        Cost_Sport: (HT_Sport * (1 + taxRate)).toFixed(2),
        Cost_Cine: (HT_Cine * (1 + taxRate)).toFixed(2),
        Cost_Kids: (HT_Kids * (1 + taxRate)).toFixed(2),
        Cost_Addtl_Scr: (HT_Addtl_Scr * (1 + taxRate)).toFixed(2),
        Cost_Autre,
        Tot_HT: Tot_HT.toFixed(2),
        Tot_Taxes: Tot_Taxes.toFixed(2),
        Tot_Mensuel: Tot_Mensuel.toFixed(2),
      };
    }

    case "sint-maarten":
    case "other":
    default: {
      const HT_MyPlan = SXM_Plan * planPrice * planQty;
      const HT_All = ALL * planPrice * planQty;
      const HT_Dec = Dec_Rental * 6;
      const HT_Family = Family * 25;
      const HT_Sport = Sport * 25;
      const HT_Cine = Cine * 16;
      const HT_Kids = Kids * 6;
      const HT_Addtl_Scr = Ecrans_Addtl * 10;

      const Tot_HT = HT_MyPlan + HT_All + HT_Dec + HT_Family + HT_Sport + HT_Cine + HT_Kids + HT_Addtl_Scr + customItemPrice;
      const Tot_Taxes = Tot_HT * taxRate;
      const Tot_Mensuel = Tot_HT + Tot_Taxes;

      return {
        Cost_MyPlan: HT_MyPlan.toFixed(2),
        Cost_All: HT_All.toFixed(2),
        Cost_Dec: HT_Dec.toFixed(2),
        Cost_Family: HT_Family.toFixed(2),
        Cost_Sport: HT_Sport.toFixed(2),
        Cost_Cine: HT_Cine.toFixed(2),
        Cost_Kids: HT_Kids.toFixed(2),
        Cost_Addtl_Scr: HT_Addtl_Scr.toFixed(2),
        Cost_Autre,
        Tot_HT: Tot_HT.toFixed(2),
        Tot_Taxes: Tot_Taxes.toFixed(2),
        Tot_Mensuel: Tot_Mensuel.toFixed(2),
      };
    }
  }
}

function calculateSetupFees(locationId: string, contractType: string): { Setup_Fee: string; Std_Install: string } {
  let setupFee: number;

  // Determine Setup_Fee based on location and contract type
  switch (locationId) {
    case "saint-barthelemy":
    // Always 199 regardless of contract type
    //     setupFee = 199;
    //     break;
    //
    case "saint-martin":
    case "sint-maarten":
      // 99 for Individual, 199 for Professional
      setupFee = contractType.toLowerCase() === "individual" ? 99 : 199;
      break;

    default:
      // Default case for any other locations
      setupFee = contractType.toLowerCase() === "individual" ? 99 : 199;
      break;
  }

  // Calculate Std_Install
  let stdInstall: number;
  if (locationId === "saint-martin") {
    // Saint-Martin has 1.04 multiplier
    stdInstall = setupFee * 1.04;
  } else {
    // All other locations: same as Setup_Fee
    stdInstall = setupFee;
  }

  console.log(
    `Setup fees for ${locationId} (${contractType}): Setup_Fee=${setupFee}, Std_Install=${stdInstall.toFixed(2)}`,
  );

  return {
    Setup_Fee: setupFee.toFixed(2),
    Std_Install: stdInstall.toFixed(2),
  };
}

// Function to get document fields
async function getDocumentFields(documentData: any): Promise<Set<string>> {
  console.log("Document data keys:", Object.keys(documentData));
  const fieldNames = new Set<string>();

  // Extract field names from text fields (using field_name property)
  if (documentData.fields && Array.isArray(documentData.fields)) {
    console.log("Found fields array with", documentData.fields.length, "items");
    if (documentData.fields.length > 0) {
      console.log("Sample field:", JSON.stringify(documentData.fields[0]));
    }
    documentData.fields.forEach((field: any) => {
      // SignNow stores the field name in json_attributes.name
      const name = field.json_attributes?.name || field.field_name || field.name || field.label;
      if (name) {
        fieldNames.add(name);
      }
    });
  }

  // Extract checkbox field names
  if (documentData.checkboxes && Array.isArray(documentData.checkboxes)) {
    console.log("Found checkboxes array with", documentData.checkboxes.length, "items");
    documentData.checkboxes.forEach((checkbox: any) => {
      const name = checkbox.json_attributes?.name || checkbox.name || checkbox.field_name || checkbox.label;
      if (name) {
        fieldNames.add(name);
      }
    });
  }

  // Also check texts property (alternative field structure)
  if (documentData.texts && Array.isArray(documentData.texts)) {
    console.log("Found texts array with", documentData.texts.length, "items");
    if (documentData.texts.length > 0) {
      console.log("Sample text:", JSON.stringify(documentData.texts[0]));
    }
    documentData.texts.forEach((text: any) => {
      const name = text.json_attributes?.name || text.field_name || text.name || text.label;
      if (name) {
        fieldNames.add(name);
      }
    });
  }

  console.log("Available fields in template:", Array.from(fieldNames));
  return fieldNames;
}

async function prefillTextFields(
  accessToken: string,
  documentId: string,
  contractData: ContractRequest,
  availableFields: Set<string>,
): Promise<void> {
  const apiBase = Deno.env.get("SIGNNOW_API_BASE_URL");

  // Build the fields array with field_name and prefilled_text structure - only add fields that exist
  const allPotentialFields = [
    // Owner (Proprio_*) - from Subscriber
    {
      field_name: "Proprio_Nom",
      prefilled_text: `${contractData.subscriberInfo.firstName} ${contractData.subscriberInfo.lastName}`,
    },
    { field_name: "Proprio_Cie", prefilled_text: contractData.subscriberInfo.companyName || " " },
    { field_name: "Proprio_Logement", prefilled_text: contractData.subscriberInfo.accommodationName || " " },
    { field_name: "Proprio_Adresse", prefilled_text: contractData.subscriberInfo.address },
    { field_name: "Proprio_email", prefilled_text: contractData.subscriberInfo.email },
    { field_name: "Proprio_Cell", prefilled_text: contractData.subscriberInfo.cellPhone },
    { field_name: "Proprio_CP", prefilled_text: contractData.subscriberInfo.postalCode },
    { field_name: "Proprio_Ville", prefilled_text: contractData.subscriberInfo.city },
    {
      field_name: "Proprio_Phone",
      prefilled_text: contractData.subscriberInfo.landlinePhone || contractData.subscriberInfo.cellPhone,
    },

    // Delivery/Installation (Livraison_*) - from Delivery or fallback to Owner
    {
      field_name: "Livraison_Adresse",
      prefilled_text: contractData.deliveryInfo?.address || contractData.subscriberInfo.address,
    },
    {
      field_name: "Livraison_CP",
      prefilled_text: contractData.deliveryInfo?.postalCode || contractData.subscriberInfo.postalCode,
    },
    {
      field_name: "Livraison_Ville",
      prefilled_text: contractData.deliveryInfo?.city || contractData.subscriberInfo.city,
    },
    {
      field_name: "Livraison_Cell",
      prefilled_text: contractData.deliveryInfo?.cellPhone || contractData.subscriberInfo.cellPhone,
    },

    // Subscription Details
    { field_name: "Ecrans_Addtl", prefilled_text: (contractData.additionalScreens || 0).toString() },
    { field_name: "Dec_Rental", prefilled_text: ((contractData.planQuantity || 1) + (contractData.additionalScreens || 0)).toString() },
  ];

  // Filter to only include fields that exist in the template
  const fields = allPotentialFields.filter((field) => availableFields.has(field.field_name));

  // Plan selection (only add if fields exist in template)
  const planId = contractData.selectedPlan.name.toLowerCase();
  console.log("selectedPlan.name.toLowerCase():", planId);
  console.log('availableFields.has("SXM_Plan"):', availableFields.has("SXM_Plan"));
  console.log('availableFields.has("ALL"):', availableFields.has("ALL"));
  if (availableFields.has("SXM_Plan") && availableFields.has("ALL")) {
    console.log("in the if loop");
    if (planId.startsWith("basic")) {
      fields.push({ field_name: "SXM_Plan", prefilled_text: "1" });
      fields.push({ field_name: "ALL", prefilled_text: "" });
    } else if (planId.startsWith("full")) {
      fields.push({ field_name: "SXM_Plan", prefilled_text: "" });
      fields.push({ field_name: "ALL", prefilled_text: "1" });
    } else {
      fields.push({ field_name: "SXM_Plan", prefilled_text: "" });
      fields.push({ field_name: "ALL", prefilled_text: "" });
    }
  } else {
    console.log("in the else loop");
    fields.push({ field_name: "ALL", prefilled_text: "1" });
  }
  console.log("end of the if loop");
  // Add-on packages (only add if fields exist in template)
  const addonIds = contractData.addons.map((addon) => addon.name.toLowerCase());
  if (availableFields.has("Sport")) {
    fields.push({ field_name: "Sport", prefilled_text: addonIds.some((id) => id.includes("sport")) ? "1" : "0" });
  }
  if (availableFields.has("Family")) {
    fields.push({ field_name: "Family", prefilled_text: addonIds.some((id) => id.includes("family")) ? "1" : "0" });
  }
  if (availableFields.has("Cine")) {
    fields.push({ field_name: "Cine", prefilled_text: addonIds.some((id) => id.includes("cinema")) ? "1" : "0" });
  }
  if (availableFields.has("Kids")) {
    fields.push({ field_name: "Kids", prefilled_text: addonIds.some((id) => id.includes("kids")) ? "1" : "0" });
  }

  // Add Manager (Mgr_*) - from Partner if provided (only fields that exist)
  if (contractData.partnerInfo?.firstName) {
    const managerFields = [
      {
        field_name: "Mgr_Nom",
        prefilled_text: `${contractData.partnerInfo.firstName} ${contractData.partnerInfo.lastName}`,
      },
      { field_name: "Mgr_Cell", prefilled_text: contractData.partnerInfo.cellPhone },
      { field_name: "Mgr_Cie", prefilled_text: contractData.partnerInfo.companyName || " " },
      { field_name: "Mgr_Adresse", prefilled_text: contractData.partnerInfo.address },
      { field_name: "Mgr_email", prefilled_text: contractData.partnerInfo.email },
      { field_name: "Mgr_CP", prefilled_text: contractData.partnerInfo.postalCode },
      { field_name: "Mgr_Ville", prefilled_text: contractData.partnerInfo.city },
    ];

    managerFields.forEach((field) => {
      if (availableFields.has(field.field_name)) {
        fields.push(field);
      }
    });
  }

  // Add CFO (DAF_*) - from Guarantor if provided (only fields that exist)
  if (contractData.guarantorInfo?.firstName) {
    const guarantorFields = [
      {
        field_name: "DAF_Nom",
        prefilled_text: `${contractData.guarantorInfo.firstName} ${contractData.guarantorInfo.lastName}`,
      },
      { field_name: "DAF_Cell", prefilled_text: contractData.guarantorInfo.cellPhone },
      {
        field_name: "DAF_Phone",
        prefilled_text: contractData.guarantorInfo.landlinePhone || contractData.guarantorInfo.cellPhone,
      },
      { field_name: "DAF_email", prefilled_text: contractData.guarantorInfo.email },
    ];

    guarantorFields.forEach((field) => {
      if (availableFields.has(field.field_name)) {
        fields.push(field);
      }
    });
  }

  // Calculate all costs based on location
  const costs = calculateCosts(contractData, contractData.customItemPrice || 0);
  console.log("Calculated costs:", costs);

  // Add all cost fields (only if they exist in template and are non-zero)
  Object.entries(costs).forEach(([key, value]) => {
    if (availableFields.has(key)) {
      const numericValue = parseFloat(value);
      if (numericValue !== 0) {
        fields.push({ field_name: key, prefilled_text: value });
      }
    }
  });

  // Verify no empty strings in payload
  const emptyFields = fields.filter((field) => field.prefilled_text === "");
  if (emptyFields.length > 0) {
    console.warn("Warning: Empty string values found:", emptyFields);
  }

  console.log("Text fields payload being sent:", JSON.stringify({ fields }, null, 2));

  // Call the v2 prefill-texts endpoint
  const response = await fetch(`${apiBase}/v2/documents/${documentId}/prefill-texts`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Text fields prefill failed:", error);
    throw new Error(`Failed to prefill text fields: ${error}`);
  }

  console.log("Text fields successfully prefilled");
}

async function prefillCheckboxFields(
  accessToken: string,
  documentId: string,
  contractData: ContractRequest,
  documentData: any,
): Promise<void> {
  const apiBase = Deno.env.get("SIGNNOW_API_BASE_URL");

  // Get checkbox fields from document data
  const checkboxFields = documentData.checks || [];

  if (checkboxFields.length === 0) {
    console.log("No checkbox fields found in template");
    return;
  }

  // Find the Mkting_OK checkbox field
  const mktingCheckbox = checkboxFields.find((check: any) => {
    const fieldName = check.json_attributes?.name || check.name || "";
    return fieldName === "Mkting_OK";
  });

  if (!mktingCheckbox) {
    console.log("Mkting_OK checkbox not found in template");
    return;
  }

  // Build the checkbox update payload with required coordinates
  const fields = [
    {
      page_number: mktingCheckbox.json_attributes?.page_number || 0,
      name: "Mkting_OK",
      value: contractData.subscriberInfo.acceptsMarketing,
      x: mktingCheckbox.json_attributes?.x || 0,
      y: mktingCheckbox.json_attributes?.y || 0,
      width: mktingCheckbox.json_attributes?.width || 15,
      height: mktingCheckbox.json_attributes?.height || 15,
    },
  ];

  console.log("Checkbox fields payload being sent:", JSON.stringify({ fields }, null, 2));

  const response = await fetch(`${apiBase}/document/${documentId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: [],
      checks: fields,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Checkbox fields prefill failed:", error);
    throw new Error(`Failed to prefill checkbox fields: ${error}`);
  }

  console.log("Checkbox fields successfully prefilled");
}

async function createDocumentFromTemplate(
  accessToken: string,
  templateId: string,
  documentName: string,
): Promise<string> {
  const response = await fetch(`${SIGNNOW_API_HOST}/template/${templateId}/copy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ document_name: documentName }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create document from template: ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`Document created from template: ${data.id}`);
  return data.id;
}


async function assignBrand(accessToken: string, documentId: string, brandId: string): Promise<void> {
  try {
    const response = await fetch(`${SIGNNOW_API_HOST}/v2/documents/${documentId}/brand`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ brand_id: brandId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`⚠️ Brand assignment failed (${response.status}): ${errorText}`);
      console.warn("Continuing without brand assignment...");
      return;
    }

    console.log(`✓ Brand ${brandId} assigned to document ${documentId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`⚠️ Brand assignment error: ${errorMessage}`);
    console.warn("Continuing without brand assignment...");
  }
}


async function getEmbedView(
  accessToken: string,
  documentId: string,
  approverEmail: string,
  signerEmail: string,
  signerFirstName: string,
  signerLastName: string,
  frontendUrl: string,
): Promise<string> {
  const redirectUri = `${frontendUrl}/contract-success`;

  // Get document details to find all roles
  const docResponse = await fetch(`${SIGNNOW_API_HOST}/document/${documentId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!docResponse.ok) {
    throw new Error(`Failed to get document: ${docResponse.statusText}`);
  }

  const doc = await docResponse.json();
  const approverRole = doc.roles?.find((r: any) => r.name === "Approver");
  const signerRole = doc.roles?.find((r: any) => r.name === "Signer");

  if (!approverRole || !signerRole) {
    throw new Error("Document must have both 'Approver' and 'Signer' roles");
  }

  // Step 1: Create embedded invites for BOTH roles (SignNow requires all roles)
  console.log(`Creating embedded invites for Approver and Signer...`);

  const invitePayload = {
    invites: [
      {
        email: approverEmail,
        role_id: approverRole.id,
        role: "Approver",
        order: 1,
        auth_method: "none",
        delivery_type: "link", // Approver uses embedded link, no email
      },
      {
        email: signerEmail,
        role_id: signerRole.id,
        role: "Signer",
        order: 2,
        auth_method: "none",
        delivery_type: "email", // Signer gets email after approver completes
        subject: "Contract Signature Required",
        message: "Please review and sign the contract.",
      },
    ],
  };

  console.log(`Embedded invite payload: ${JSON.stringify(invitePayload)}`);

  const createInviteResponse = await fetch(`${SIGNNOW_API_HOST}/v2/documents/${documentId}/embedded-invites`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(invitePayload),
  });

  if (!createInviteResponse.ok) {
    const errorText = await createInviteResponse.text();
    console.error("Create embedded invite error:", errorText);
    console.error(`Status: ${createInviteResponse.status} ${createInviteResponse.statusText}`);
    throw new Error(`Failed to create embedded invite: ${createInviteResponse.statusText}`);
  }

  const inviteData = await createInviteResponse.json();
  console.log("Embedded invite response:", JSON.stringify(inviteData));

  // Extract field_invite_id for the APPROVER (first invite)
  const approverInvite = inviteData.data?.find((inv: any) => inv.email === approverEmail);
  const fieldInviteId = approverInvite?.id;

  if (!fieldInviteId) {
    console.error("No field_invite_id found in response:", JSON.stringify(inviteData));
    throw new Error("No field_invite_id returned for approver");
  }

  console.log(`Embedded invite created with field_invite_id: ${fieldInviteId}`);

  // Step 2: Generate the embedded signing link for approver only
  // Use POST with link generation parameters
  const linkResponse = await fetch(
    `${SIGNNOW_API_HOST}/v2/documents/${documentId}/embedded-invites/${fieldInviteId}/link`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_method: "none",
        link_expiration: 45, // 44 minutes (being conservative with SignNow's 45min max)
        redirect_uri: redirectUri,
      }),
    }
  );

  if (!linkResponse.ok) {
    const linkErrorText = await linkResponse.text();
    console.error("Get embed link error:", linkErrorText);
    console.error(`Status: ${linkResponse.status} ${linkResponse.statusText}`);
    console.error(
      `Request body was:`,
      JSON.stringify({
        auth_method: "none",
        link_expiration: 2700,
        redirect_uri: redirectUri,
      }),
    );
    throw new Error(`Failed to get embed link: ${linkResponse.statusText} - ${linkErrorText}`);
  }

  const linkData = await linkResponse.json();
  console.log(`Embed link generated for approver: ${approverEmail}`);
  return linkData.data?.link || linkData.link;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contractData: ContractRequest = await req.json();

    console.log("=== APPROVER FLOW (ESSENTIALS) ===");
    console.log(`Location: ${contractData.location.id}`);
    console.log(`Legal Package: ${contractData.includeLegalPackage}`);
    console.log(`Approver: ${contractData.approverName} (${contractData.approverEmail})`);
    console.log(
      `Signer: ${contractData.subscriberInfo.firstName} ${contractData.subscriberInfo.lastName} (${contractData.subscriberInfo.email})`,
    );

    const accessToken = await getAccessToken();

    // Step 1: Select and create document from approver template
    const templateId = getApproverTemplateId(contractData.location.id, contractData.includeLegalPackage ?? true);
    const documentName = `Contract - ${contractData.subscriberInfo.firstName} ${contractData.subscriberInfo.lastName}`;
    const documentId = await createDocumentFromTemplate(accessToken, templateId, documentName);

    // Step 2: Get document data and available fields
    const docResponse = await fetch(`${SIGNNOW_API_HOST}/document/${documentId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!docResponse.ok) {
      throw new Error(`Failed to get document: ${docResponse.statusText}`);
    }

    const documentData = await docResponse.json();
    const availableFields = await getDocumentFields(documentData);

    // Step 3: Prefill fields
    await prefillTextFields(accessToken, documentId, contractData, availableFields);
    await prefillCheckboxFields(accessToken, documentId, contractData, documentData);

    // Step 4: Assign brand and signing settings
    if (SIGNNOW_BRAND_ID) {
      console.log(`Attempting to assign brand: ${SIGNNOW_BRAND_ID}`);
      await assignBrand(accessToken, documentId, SIGNNOW_BRAND_ID);
    } else {
      console.log("No brand ID configured, skipping brand assignment");
    }

    // Step 4: Generate embedded signing URL for approver with email delivery for signer
    // The embedded invites with delivery_type settings handle the entire flow:
    // - Approver gets embedded link (no email)
    // - Signer gets automatic email after approver completes
    const embedUrl = await getEmbedView(
      accessToken,
      documentId,
      contractData.approverEmail!,
      contractData.subscriberInfo.email,
      contractData.subscriberInfo.firstName,
      contractData.subscriberInfo.lastName,
      contractData.frontendUrl || "https://id-preview--34551397-f155-4fb6-b847-b2f113653a03.lovable.app",
    );

    console.log("✓ Embedded flow configured: Approver signs embedded → Signer receives automatic email");

    console.log("✓ Approver flow initialized successfully");

    return new Response(
      JSON.stringify({
        success: true,
        embedUrl,
        documentId,
        flowType: "approver_embed",
        approverName: contractData.approverName,
        signerName: `${contractData.subscriberInfo.firstName} ${contractData.subscriberInfo.lastName}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Error in signnow-essentials:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
