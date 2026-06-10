import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
// ============================================================
// API DEBUGGER UTILITY - Deno Compatible
// ============================================================

interface ApiDebugResult {
  original: any;
  modified: any;
  success: boolean;
  error?: string;
  endpoint: string;
  attributePath: string;
}

// ============================================================
// LOGGER UTILITY
// ============================================================
const LOG_LEVEL = {
  NONE: 0,
  ERROR: 1,
  INFO: 2,
  VERBOSE: 3,
};

// Default to INFO if not specified
let CURRENT_LOG_LEVEL = LOG_LEVEL.VERBOSE;

function logger(level: number, message: string, data?: any) {
  if (level <= CURRENT_LOG_LEVEL) {
    if (data) {
      console.log(
        `[${level === 1 ? "ERROR" : "INFO"}] ${message}`,
        JSON.stringify(data, null, 2)
      );
    } else {
      console.log(`[${level === 1 ? "ERROR" : "INFO"}] ${message}`);
    }
  }
}

/**
 * Get a nested property value using dot notation
 */
function getNestedProperty(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => {
    const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayKey, index] = arrayMatch;
      return current?.[arrayKey]?.[parseInt(index)];
    }
    return current?.[key];
  }, obj);
}

/**
 * Set a nested property value using dot notation
 */
function setNestedProperty(obj: any, path: string, value: any): any {
  const keys = path.split(".");
  const lastKey = keys.pop()!;

  const result = JSON.parse(JSON.stringify(obj));

  let current = result;
  for (const key of keys) {
    const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayKey, index] = arrayMatch;
      if (!current[arrayKey]) current[arrayKey] = [];
      current = current[arrayKey][parseInt(index)];
    } else {
      if (!current[key]) current[key] = {};
      current = current[key];
    }
  }

  const arrayMatch = lastKey.match(/^(\w+)\[(\d+)\]$/);
  if (arrayMatch) {
    const [, arrayKey, index] = arrayMatch;
    if (!current[arrayKey]) current[arrayKey] = [];
    current[arrayKey][parseInt(index)] = value;
  } else {
    current[lastKey] = value;
  }

  return result;
}

// Global debug store for this request
let debugData: ApiDebugResult | null = null;

/**
 * Check if user has staff role
 */
async function checkStaffAccess(userId: string): Promise<boolean> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("[DEBUG] Supabase credentials not available");
      return false;
    }

    const { createClient } = await import(
      "https://esm.sh/@supabase/supabase-js@2"
    );
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "staff"]);

    if (error) {
      console.error("[DEBUG] Error checking staff access:", error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error("[DEBUG] Exception checking staff access:", error);
    return false;
  }
}

interface ContractRequest {
  emails: any;
  documentId: string;
  action: string;
  currency?: string;
  taxDesc?: string;
  taxAmount?: number;
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
  langContract: string;
  additionalScreens: number;
  additionalScreenUnitCost?: number;
  planQuantity?: number;
  decoderOption?: "rent" | "buy";
  decoderRental?: boolean;
  customItemName?: string;
  customItemPrice?: number;
  autrePoncText?: string;
  autrePoncCost?: number;
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
  sendMethod?: "embed" | "email" | "sms" | "kiosk";
  authenticationMethod?: "password" | "sms" | "none";
  includeLegalPackage?: boolean;
  planInfo?: {
    contractType?: string;
  };
  // --- ADD THIS BLOCK ---
  selectedFees?: Array<{
    id: string;
    name: string;
    price: number;
  }>;
  // --- NEW DECODER OPTIONS ---
  selectedDecoders?: Array<{
    id: string;
    name: string;
    quantity: number;
    upfrontPrice: number;
    monthlyPrice: number;
  }>;
  // ---------------------------
  subscriptionId?: string;
  frontendUrl?: string;
  useApproverFlow?: boolean;
  approverName?: string;
  approverEmail?: string;
  decoderRentalComment?: string;
  planComment?: string;
  addonComments?: Record<string, string>;
  connectionFeeComment?: string;
  installFeeComment?: string;
  decoderPurchaseComment?: string;
  satelliteDishComment?: string;
  otherEquipmentComment?: string;
  otherEquipment2Comment?: string;
  additionalScreensComment?: string;
  debugConfig?: {
    enabled: boolean;
    endpoint: string;
    attributePath: string;
    newValue: any;
  };
  staffUserId?: string;
}

//------------------------------
// ==========================================
// AWS SES HELPERS (For sending Attachments)
// ==========================================
const encoder = new TextEncoder();
// Helper to format numbers into currency strings for the PDF
const formatCurrency = (
  amount: number | null | undefined,
  currencyCode?: string
) => {
  if (amount === null || amount === undefined || isNaN(amount)) return "";
  const symbol = currencyCode === "USD" ? "$" : "€";
  return `${symbol}${Number(amount).toFixed(2)}`;
};
async function hmacSha256(
  key: ArrayBuffer,
  message: string
): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return (await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(message)
  )) as ArrayBuffer;
}

async function sha256(message: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(message));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getSignatureKey(
  key: string,
  dateStamp: string,
  regionName: string,
  serviceName: string
): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(
    encoder.encode("AWS4" + key).buffer,
    dateStamp
  );
  const kRegion = await hmacSha256(kDate, regionName);
  const kService = await hmacSha256(kRegion, serviceName);
  const kSigning = await hmacSha256(kService, "aws4_request");
  return kSigning;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

//-------------------------------

async function registerSignNowWebhook(accessToken: string, documentId: string) {
  const apiBase = Deno.env.get("SIGNNOW_API_BASE_URL");
  const webhookUrl = `https://${Deno.env.get(
    "PROJECT_ID"
  )}.supabase.co/functions/v1/signnow-webhook`;

  logger(
    LOG_LEVEL.INFO,
    `🔗 Registering Webhook (V2) for Document: ${documentId}`
  );

  try {
    const response = await fetch(`${apiBase}/v2/event-subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        event: "document.complete",
        entity_id: documentId,
        attributes: {
          callback: webhookUrl,
          use_tls_12: true,
          docid_queryparam: true,
        },
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      try {
        const errorJson = JSON.parse(responseText);
        // FIX: Check for the specific "Duplicate Subscription" error code
        if (errorJson.errors && errorJson.errors[0]?.code === 15006045) {
          logger(
            LOG_LEVEL.INFO,
            `ℹ️ Webhook already registered for doc ${documentId}. Continuing.`
          );
          return; // Soft success
        }
      } catch (e) {}
      logger(LOG_LEVEL.ERROR, `Failed to register V2 webhook: ${responseText}`);
      logger(
        LOG_LEVEL.ERROR,
        `[CLIENT DEBUG] Failing Endpoint: ${apiBase}/v2/event-subscriptions`
      );
      logger(LOG_LEVEL.ERROR, `[CLIENT DEBUG] Token Used: ${accessToken}`);

      logger(LOG_LEVEL.ERROR, `Failed to register V2 webhook: ${responseText}`);
    } else {
      logger(
        LOG_LEVEL.INFO,
        `✅ V2 Webhook registered successfully for doc ${documentId}`
      );
    }
  } catch (err) {
    logger(
      LOG_LEVEL.ERROR,
      `V2 Webhook registration exception: ${err.message}`
    );
  }
}

function getTemplateIdForLocation(locationId: string): string | null {
  if (!locationId) return null; // <--- ADD THIS GUARD
  const envKey = `SIGNNOW_TEMPLATE_ID_${locationId
    .toUpperCase()
    .replace(/-/g, "_")}`;
  const templateId = Deno.env.get(envKey);

  if (templateId) {
    logger(
      LOG_LEVEL.VERBOSE,
      `Using location-specific template for ${locationId}: ${templateId}`
    );
    return templateId;
  }

  const defaultTemplate = Deno.env.get("SIGNNOW_TEMPLATE_ID");
  logger(
    LOG_LEVEL.VERBOSE,
    `Using default template for ${locationId}: ${defaultTemplate}`
  );
  return defaultTemplate || null;
}

function getLegalTemplateId(
  locationId: string,
  contractType: string
): string | null {
  const normalizedLocation = locationId.toUpperCase().replace(/-/g, "_");
  const normalizedType = contractType.toUpperCase();
  const envKey = `SIGNNOW_LEGAL_TEMPLATE_${normalizedLocation}_${normalizedType}`;
  const templateId = Deno.env.get(envKey);

  if (templateId) {
    logger(
      LOG_LEVEL.VERBOSE,
      `Using legal template for ${locationId} (${contractType}): ${templateId}`
    );
  } else {
    console.warn(`No legal template configured: ${envKey}`);
  }

  return templateId || null;
}

function getBrandIdForLocation(locationId: string): string | null {
  if (locationId === "saint-barthelemy" || locationId === "saint-martin") {
    const frenchBrandId = Deno.env.get("SIGNNOW_BRAND_ID_FR");
    logger(
      LOG_LEVEL.VERBOSE,
      `Using French brand for ${locationId}: ${frenchBrandId}`
    );
    return frenchBrandId || null;
  }

  const defaultBrandId = Deno.env.get("SIGNNOW_BRAND_ID");
  logger(
    LOG_LEVEL.VERBOSE,
    `Using default brand for ${locationId}: ${defaultBrandId}`
  );
  return defaultBrandId || null;
}

async function emailSignedDocument(
  accessToken: string,
  documentId: string,
  recipientEmails: string[]
): Promise<void> {
  const apiBase = Deno.env.get("SIGNNOW_API_BASE_URL");

  // AWS Configuration
  const awsAccessKey = Deno.env.get("AWS_ACCESS_KEY_ID");
  const awsSecretKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
  const awsRegion = Deno.env.get("AWS_REGION") || "us-east-1";
  const senderEmail = Deno.env.get("SES_FROM_EMAIL");

  if (!awsAccessKey || !awsSecretKey || !senderEmail) {
    throw new Error("Missing AWS SES configuration for contract emails");
  }
  const financeEmail = Deno.env.get("SIGNNOW_FINANCE_CC_EMAIL");

  const finalRecipients = new Set(recipientEmails);

  if (financeEmail) {
    finalRecipients.add(financeEmail.trim());
    logger(
      LOG_LEVEL.INFO,
      `Adding Finance CC to distribution list: ${financeEmail}`
    );
  }

  const targetEmails = Array.from(finalRecipients);
  logger(
    LOG_LEVEL.INFO,
    `Starting Email Process. Doc: ${documentId}, Recipients: ${recipientEmails.join(
      ", "
    )}`
  );

  // 1. WAIT FOR DOCUMENT COMPLETION
  let isReady = false;
  let attempts = 0;
  while (!isReady && attempts < 10) {
    attempts++;
    const docRes = await fetch(`${apiBase}/document/${documentId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (docRes.ok) {
      const docData = await docRes.json();
      const status =
        docData.field_invites?.[0]?.status || docData.status || "pending";
      if (
        status === "completed" ||
        status === "signed" ||
        status === "fulfilled"
      )
        isReady = true;
    }
    if (!isReady) await new Promise((r) => setTimeout(r, 2000));
  }

  if (!isReady)
    throw new Error("Timeout: Document never finalized. Cannot download.");

  await new Promise((r) => setTimeout(r, 3000));

  // 2. DOWNLOAD PDF FROM SIGNNOW
  logger(LOG_LEVEL.INFO, "Downloading PDF from SignNow...");
  const pdfRes = await fetch(
    `${apiBase}/document/${documentId}/download?type=collapsed`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!pdfRes.ok) throw new Error("Failed to download PDF from SignNow");
  const pdfArrayBuffer = await pdfRes.arrayBuffer();

  const u8 = new Uint8Array(pdfArrayBuffer);
  const CHUNK_SIZE = 0x8000;
  let index = 0;
  const length = u8.length;
  let binaryString = "";

  while (index < length) {
    const slice = u8.subarray(index, Math.min(index + CHUNK_SIZE, length));
    binaryString += String.fromCharCode.apply(null, Array.from(slice));
    index += CHUNK_SIZE;
  }

  const pdfBase64 = btoa(binaryString);

  logger(
    LOG_LEVEL.INFO,
    `PDF Encoded successfully. Size: ${pdfArrayBuffer.byteLength} bytes.`
  );

  // 3. SEND VIA AWS SES
  for (const email of targetEmails) {
    if (!email) continue;

    const boundary = "NextPart_000_0001_" + Date.now().toString();
    const rawEmailData = `From: IDEAL TV <${senderEmail}>
To: ${email}
Subject: Your Signed Contract - IDEAL TV
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="${boundary}"

--${boundary}
Content-Type: text/html; charset=utf-8

<html>
<body>
  <h2>Contract Signed Successfully</h2>
  <p>Hello,</p>
  <p>Please find attached the signed subscription contract.</p>
  <p>Thank you,<br>IDEAL TV Team</p>
</body>
</html>

--${boundary}
Content-Type: application/pdf; name="Signed_Contract.pdf"
Content-Transfer-Encoding: base64
Content-Disposition: attachment; filename="Signed_Contract.pdf"

${pdfBase64}
--${boundary}--`;

    const service = "ses";
    const host = `email.${awsRegion}.amazonaws.com`;
    const endpoint = `https://${host}/v2/email/outbound-emails`;
    const now = new Date();
    const amzDate =
      now
        .toISOString()
        .replace(/[:-]|\.\d{3}/g, "")
        .slice(0, 15) + "Z";
    const dateStamp = amzDate.slice(0, 8);

    const requestBody = JSON.stringify({
      Content: { Raw: { Data: btoa(rawEmailData) } },
    });

    const payloadHash = await sha256(requestBody);
    const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = "content-type;host;x-amz-date";
    const canonicalRequest = `POST\n/v2/email/outbound-emails\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    const algorithm = "AWS4-HMAC-SHA256";
    const credentialScope = `${dateStamp}/${awsRegion}/${service}/aws4_request`;
    const stringToSign =
      `${algorithm}\n${amzDate}\n${credentialScope}\n` +
      (await sha256(canonicalRequest));

    const signingKey = await getSignatureKey(
      awsSecretKey,
      dateStamp,
      awsRegion,
      service
    );
    const signatureBuffer = await hmacSha256(signingKey, stringToSign);
    const signature = toHex(signatureBuffer);
    const authHeader = `${algorithm} Credential=${awsAccessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const sesRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Amz-Date": amzDate,
        Authorization: authHeader,
      },
      body: requestBody,
    });

    if (!sesRes.ok) {
      const errText = await sesRes.text();
      logger(LOG_LEVEL.ERROR, `Failed to send to ${email} via SES: ${errText}`);
    } else {
      logger(LOG_LEVEL.INFO, `✓ Email sent successfully to ${email} via SES`);
    }
  }
}

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get("SIGNNOW_CLIENT_ID");
  const clientSecret = Deno.env.get("SIGNNOW_CLIENT_SECRET");
  const userEmail = Deno.env.get("SIGNNOW_USER_EMAIL");
  const userPassword = Deno.env.get("SIGNNOW_USER_PASSWORD");
  const apiBase = Deno.env.get("SIGNNOW_API_BASE_URL");

  if (!clientId || !clientSecret || !userEmail || !userPassword || !apiBase) {
    throw new Error("Missing SignNow credentials");
  }

  const tokenResponse = await fetch(`${apiBase}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: new URLSearchParams({
      grant_type: "password",
      username: userEmail,
      password: userPassword,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    console.error("Token error:", error);
    throw new Error("Failed to get access token");
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// ==========================================
// SIGNNOW FOLDER MANAGEMENT
// ==========================================
const SIGNNOW_FOLDERS = {
  PENDING: "4fcc4c699ef04e8d9bdc90e096e0d3535317709f",
  SIGNED: "0ef349ad932146b59045cea04995e28c50d1a8c4",
  EXPIRED: "471402213ed94cef9145027afa6c786886e862a4",
};

async function moveSignNowDocument(
  documentId: string,
  folderId: string,
  accessToken: string
) {
  const apiBase =
    Deno.env.get("SIGNNOW_API_BASE_URL") || "https://api.signnow.com";
  logger(
    LOG_LEVEL.INFO,
    `📂 Attempting to move document ${documentId} to folder ${folderId}`
  );

  try {
    const response = await fetch(`${apiBase}/document/${documentId}/move`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ folder_id: folderId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger(
        LOG_LEVEL.ERROR,
        `❌ Failed to move document ${documentId}: ${errorText}`
      );
      return false; // Soft fail, doesn't break the contract creation
    }

    logger(
      LOG_LEVEL.INFO,
      `✅ Document successfully moved to folder ${folderId}.`
    );
    return true;
  } catch (error) {
    logger(LOG_LEVEL.ERROR, `❌ Exception moving document: ${error.message}`);
    return false;
  }
}

async function getTemplateSmartFields(
  accessToken: string,
  templateId: string
): Promise<any> {
  const apiBase = Deno.env.get("SIGNNOW_API_BASE_URL");

  const response = await fetch(
    `${apiBase}/document/${templateId}/integration_objects`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to get Smart Fields from template:", error);
    throw new Error("Failed to retrieve Smart Fields structure");
  }

  const smartFieldsData = await response.json();
  logger(
    LOG_LEVEL.VERBOSE,
    "Smart Fields structure retrieved",
    smartFieldsData
  );
  return smartFieldsData;
}

function calculateCosts(
  contractData: ContractRequest,
  customItemPrice: number = 0
): Record<string, string> {
  // 1. Prioritize the totals already calculated by the backend controller
  // If these exist in the payload, use them directly!
  if (contractData.Tot_HT && contractData.Tot_Mensuel) {
    return {
      Tot_HT: formatCurrency(
        parseFloat(contractData.Tot_HT as any),
        contractData.currency
      ),
      Tot_Taxes: formatCurrency(
        parseFloat(contractData.Tot_Taxes as any),
        contractData.currency
      ),
      Tot_Mensuel: formatCurrency(
        parseFloat(contractData.Tot_Mensuel as any),
        contractData.currency
      ),
      Tot_Recurring_Cost: formatCurrency(
        parseFloat(contractData.Tot_Mensuel as any),
        contractData.currency
      ),
    };
  }

  // 2. Fallback: Only re-calculate if the values are missing (Safety net)
  console.warn(
    "⚠️ Recalculating totals in Edge Function (Backend totals missing)"
  );

  const planPrice = contractData.selectedPlan?.price || 0;
  const planQty = contractData.planQuantity || 1;
  const additionalScreens = contractData.additionalScreens || 0;

  let totalAddonCost = 0;
  if (contractData.addons && contractData.addons.length > 0) {
    contractData.addons.forEach((addon) => {
      // 🚨 FIX: Respect exact addon quantity. If missing entirely, fallback to planQty.
      const qty =
        addon.quantity !== undefined && addon.quantity !== null
          ? addon.quantity
          : planQty;
      totalAddonCost += (addon.price || 0) * qty;
    });
  }

  let rentalCost = 0;
  const totalScreens = planQty + additionalScreens;

  if (
    contractData.selectedDecoders &&
    contractData.selectedDecoders.length > 0
  ) {
    rentalCost = contractData.selectedDecoders.reduce(
      (sum, d) => sum + Number(d.monthlyPrice) * d.quantity,
      0
    );
  } else {
    const rentalPrice =
      contractData.location.id === "saint-barthelemy" ? 10.0 : 6.0;
    rentalCost = contractData.decoderRental ? rentalPrice * totalScreens : 0;
  }

  const screenPrice = contractData.additionalScreenUnitCost || 10.0;
  const additionalScreensCost = additionalScreens * screenPrice;
  const planTotal = planPrice * planQty;

  const Tot_HT =
    planTotal +
    rentalCost +
    additionalScreensCost +
    totalAddonCost +
    customItemPrice;
  const taxRate = Number(contractData.taxAmount || 0);
  const Tot_Taxes = Tot_HT * taxRate;
  const Tot_Mensuel = Tot_HT + Tot_Taxes;

  return {
    Tot_HT: formatCurrency(Tot_HT, contractData.currency),
    Tot_Taxes: formatCurrency(Tot_Taxes, contractData.currency),
    Tot_Mensuel: formatCurrency(Tot_Mensuel, contractData.currency),
    Tot_Recurring_Cost: formatCurrency(Tot_Mensuel, contractData.currency),
  };
}

// function calculateCosts(
//   contractData: ContractRequest,
//   customItemPrice: number = 0
// ): Record<string, string> {
//   const planPrice = contractData.selectedPlan?.price || 0;
//   const planQty = contractData.planQuantity || 1;
//   const additionalScreens = contractData.additionalScreens || 0;

//   let totalAddonCost = 0;
//   if (contractData.addons && contractData.addons.length > 0) {
//     contractData.addons.forEach((addon) => {
//       totalAddonCost += (addon.price || 0) * planQty;
//     });
//   }

//   let rentalCost = 0;
//   const totalScreens = planQty + additionalScreens;

//   if (
//     contractData.selectedDecoders &&
//     contractData.selectedDecoders.length > 0
//   ) {
//     rentalCost = contractData.selectedDecoders.reduce(
//       (sum, d) => sum + Number(d.monthlyPrice) * d.quantity,
//       0
//     );
//   } else {
//     const rentalPrice =
//       contractData.location.id === "saint-barthelemy" ? 10.0 : 6.0;
//     rentalCost = contractData.decoderRental ? rentalPrice * totalScreens : 0;
//   }

//   const screenPrice =
//     contractData.additionalScreenUnitCost !== undefined
//       ? Number(contractData.additionalScreenUnitCost)
//       : contractData.location.id === "saint-barthelemy"
//       ? 20.0
//       : 10.0;
//   const additionalScreensCost = additionalScreens * screenPrice;
//   const planTotal = planPrice * planQty;

//   const Tot_HT =
//     planTotal +
//     rentalCost +
//     additionalScreensCost +
//     totalAddonCost +
//     customItemPrice;

//   const taxRate =
//     contractData.taxAmount !== undefined
//       ? Number(contractData.taxAmount)
//       : contractData.location.id === "saint-martin"
//       ? 0.04
//       : 0;

//   const Tot_Taxes = Tot_HT * taxRate;
//   const Tot_Mensuel = Tot_HT + Tot_Taxes;

//   // 🚀 Wrapped in Currency Formatter
//   return {
//     Tot_HT: formatCurrency(Tot_HT, contractData.currency),
//     Tot_Taxes: formatCurrency(Tot_Taxes, contractData.currency),
//     Tot_Mensuel: formatCurrency(Tot_Mensuel, contractData.currency),
//     Tot_Recurring_Cost: formatCurrency(Tot_Mensuel, contractData.currency),
//   };
// }

function calculatePoncCosts(
  contractData: ContractRequest,
  Autre_Ponc_Price: number = 0
): Record<string, string> {
  const hasDynamicFees =
    contractData.selectedFees && contractData.selectedFees.length > 0;

  const Connection_Cost =
    contractData.connectionFeeEnabled && !hasDynamicFees
      ? contractData.connectionFeeCost || 0
      : 0;
  const Install_Cost =
    contractData.installFeeEnabled && !hasDynamicFees
      ? contractData.installFeeCost || 0
      : 0;

  const Dynamic_Fees_Cost = hasDynamicFees
    ? (contractData.selectedFees || []).reduce(
        (sum, fee) => sum + (Number(fee.price) || 0),
        0
      )
    : 0;

  let DecodBuy_Cost = 0;
  if (
    contractData.selectedDecoders &&
    contractData.selectedDecoders.length > 0
  ) {
    DecodBuy_Cost = contractData.selectedDecoders.reduce(
      (sum, d) => sum + Number(d.upfrontPrice) * d.quantity,
      0
    );
  } else {
    DecodBuy_Cost =
      contractData.decoderHardwareEnabled && !contractData.decoderRental
        ? contractData.decoderHardwareCost || 0
        : 0;
  }

  const Dish_Cost = contractData.satelliteDishEnabled
    ? contractData.satelliteDishCost || 0
    : 0;
  const OtherEquipment_Cost = contractData.otherHardwareEnabled
    ? contractData.otherHardwareCost || 0
    : 0;
  const OtherEquipment2_Cost = contractData.otherHardware2Enabled
    ? contractData.otherHardware2Cost || 0
    : 0;

  const Tot_HT_Ponc =
    Connection_Cost +
    Install_Cost +
    DecodBuy_Cost +
    Dish_Cost +
    OtherEquipment_Cost +
    OtherEquipment2_Cost +
    Autre_Ponc_Price +
    Dynamic_Fees_Cost;

  const taxRate = Number(contractData.taxAmount || 0);
  const Tot_Taxes_Ponc = Tot_HT_Ponc * taxRate;
  const Tot_Ponc = Tot_HT_Ponc + Tot_Taxes_Ponc;

  // 🚀 Wrapped in Currency Formatter
  return {
    Connection_Cost: formatCurrency(Connection_Cost, contractData.currency),
    Install_Cost: formatCurrency(Install_Cost, contractData.currency),
    DecodBuy_Cost: formatCurrency(DecodBuy_Cost, contractData.currency),
    Dish_Cost: formatCurrency(Dish_Cost, contractData.currency),
    OtherEquipment_Cost: formatCurrency(
      OtherEquipment_Cost,
      contractData.currency
    ),
    OtherEquipment2_Cost: formatCurrency(
      OtherEquipment2_Cost,
      contractData.currency
    ),
    Tot_HT_Ponc: formatCurrency(Tot_HT_Ponc, contractData.currency),
    Tot_Taxes_Ponc: formatCurrency(Tot_Taxes_Ponc, contractData.currency),
    Tot_Ponc: formatCurrency(Tot_Ponc, contractData.currency),
  };
}

function calculateSetupFees(
  locationId: string,
  contractType: string
): { Setup_Fee: string; Std_Install: string } {
  let setupFee: number;
  switch (locationId) {
    case "saint-barthelemy":
    case "saint-martin":
    case "sint-maarten":
      setupFee = contractType.toLowerCase() === "individual" ? 99 : 199;
      break;
    default:
      setupFee = contractType.toLowerCase() === "individual" ? 99 : 199;
      break;
  }

  let stdInstall: number;
  if (locationId === "saint-martin") {
    stdInstall = setupFee * 1.04;
  } else {
    stdInstall = setupFee;
  }

  return {
    Setup_Fee: setupFee.toFixed(2),
    Std_Install: stdInstall.toFixed(2),
  };
}

function filterEmptyFields(
  smartFieldsData: Array<Record<string, string>>
): Array<Record<string, string>> {
  return smartFieldsData.filter((fieldObj) => {
    const [key, value] = Object.entries(fieldObj)[0];
    return value && value.trim().length > 0;
  });
}

async function prefillSmartFields(
  accessToken: string,
  documentId: string,
  smartFieldObjectId: string,
  contractData: ContractRequest
): Promise<void> {
  const apiBase = Deno.env.get("SIGNNOW_API_BASE_URL");

  const smartFieldsData: Array<Record<string, string>> = [
    {
      Proprio_Nom: `${contractData.subscriberInfo.firstName} ${contractData.subscriberInfo.lastName}`,
    },
    { Proprio_email: contractData.subscriberInfo.email },
    { Proprio_Cell: contractData.subscriberInfo.cellPhone },
    { Proprio_Phone: contractData.subscriberInfo.landlinePhone || " " },
    { Proprio_Cie: contractData.subscriberInfo.companyName || " " },
    { Proprio_Logement: contractData.subscriberInfo.accommodationName || " " }, // <--- ADD THIS LINE
    { Proprio_Adresse: contractData.subscriberInfo.address },
    { Proprio_CP: contractData.subscriberInfo.postalCode },
    { Proprio_Ville: contractData.subscriberInfo.city },
    { Mkting_OK: contractData.subscriberInfo.acceptsMarketing ? "X" : "" },
    {
      Subscription_Region:
        contractData.location.id === "saint-barthelemy"
          ? "Saint-Barthélemy"
          : contractData.location.id === "sint-maarten"
          ? "Sint-Maarten"
          : "Saint-Martin",
    },
  ];

  if (contractData.partnerInfo?.firstName) {
    smartFieldsData.push(
      {
        Mgr_Nom: `${contractData.partnerInfo.firstName} ${contractData.partnerInfo.lastName}`,
      },
      { Mgr_Cell: contractData.partnerInfo.cellPhone },
      { Mgr_Cie: contractData.partnerInfo.companyName || " " },
      { Mgr_Adresse: contractData.partnerInfo.address },
      { Mgr_email: contractData.partnerInfo.email },
      { Mgr_CP: contractData.partnerInfo.postalCode },
      { Mgr_Ville: contractData.partnerInfo.city }
    );
  }

  if (contractData.guarantorInfo?.firstName) {
    smartFieldsData.push(
      {
        DAF_Nom: `${contractData.guarantorInfo.firstName} ${contractData.guarantorInfo.lastName}`,
      },
      { DAF_Cell: contractData.guarantorInfo.cellPhone },
      { DAF_Phone: contractData.guarantorInfo.landlinePhone || " " },
      { DAF_email: contractData.guarantorInfo.email }
    );
  }
  // ✅ ADD THIS NEW BLOCK FOR DELIVERY INFO
  if (contractData.deliveryInfo?.address) {
    smartFieldsData.push(
      { Livraison_Adresse: contractData.deliveryInfo.address },
      { Livraison_Ville: contractData.deliveryInfo.city },
      { Livraison_CP: contractData.deliveryInfo.postalCode },
      { Livraison_Cell: contractData.deliveryInfo.cellPhone }
    );
  }
  const planQty = contractData.planQuantity || 1;
  const additionalScreens = contractData.additionalScreens || 0;
  const totalScreens = planQty + additionalScreens;

  smartFieldsData.push({ Tot_screens: totalScreens.toString() });
  smartFieldsData.push({ Total_Number_Screens: totalScreens.toString() });

  let packIndex = 1;
  const planPrice = contractData.selectedPlan.price || 0;
  const displayPlanName = contractData.selectedPlan.name;

  smartFieldsData.push(
    { [`Pack${packIndex}_Desc`]: displayPlanName },
    {
      [`Pack${packIndex}_Monthly`]:
        planPrice > 0 ? formatCurrency(planPrice, contractData.currency) : "",
    },
    { [`Pack${packIndex}_Qty`]: planQty.toString() },
    { [`Pack${packIndex}_Comment`]: contractData.planComment || "" },
    {
      [`Pack${packIndex}_Cost`]: formatCurrency(
        planPrice * planQty,
        contractData.currency
      ),
    }
  );
  packIndex++;

  if (
    contractData.selectedDecoders &&
    contractData.selectedDecoders.length > 0
  ) {
    contractData.selectedDecoders.forEach((decoder) => {
      if (Number(decoder.monthlyPrice) > 0 && packIndex <= 3) {
        smartFieldsData.push(
          { [`Pack${packIndex}_Desc`]: decoder.name },
          {
            [`Pack${packIndex}_Monthly`]: formatCurrency(
              Number(decoder.monthlyPrice),
              contractData.currency
            ),
          },
          { [`Pack${packIndex}_Qty`]: decoder.quantity.toString() },
          {
            [`Pack${packIndex}_Comment`]:
              contractData.decoderRentalComment || "",
          },
          {
            [`Pack${packIndex}_Cost`]: formatCurrency(
              Number(decoder.monthlyPrice) * decoder.quantity,
              contractData.currency
            ),
          }
        );
        packIndex++;
      }
    });
  } else if (contractData.decoderRental) {
    const rentalPrice =
      contractData.location.id === "saint-barthelemy" ? 10.0 : 6.0;
    smartFieldsData.push(
      { [`Pack${packIndex}_Desc`]: "Location Décodeur" },
      {
        [`Pack${packIndex}_Monthly`]: formatCurrency(
          rentalPrice,
          contractData.currency
        ),
      },
      { [`Pack${packIndex}_Qty`]: totalScreens.toString() },
      { [`Pack${packIndex}_Comment`]: contractData.decoderRentalComment || "" },
      {
        [`Pack${packIndex}_Cost`]: formatCurrency(
          rentalPrice * totalScreens,
          contractData.currency
        ),
      }
    );
    packIndex++;
  }
  let optIndex = 1;
  if (contractData.addons && contractData.addons.length > 0) {
    contractData.addons.forEach((addon) => {
      if (optIndex <= 5) {
        const addonPrice = addon.price || 0;
        // 🚨 FIX: Safely check for quantity so '0' doesn't evaluate to false
        const addonQty =
          addon.quantity !== undefined && addon.quantity !== null
            ? addon.quantity
            : planQty;

        smartFieldsData.push(
          { [`Opt${optIndex}_Desc`]: addon.name },
          {
            [`Opt${optIndex}_Monthly`]:
              addonPrice > 0
                ? formatCurrency(addonPrice, contractData.currency)
                : "",
          },
          { [`Opt${optIndex}_Qty`]: addonQty.toString() },
          {
            [`Opt${optIndex}_Cost`]: formatCurrency(
              addonPrice * addonQty,
              contractData.currency
            ),
          }
        );
        if (
          contractData.addonComments &&
          contractData.addonComments[addon.name]
        ) {
          smartFieldsData.push({
            [`Opt${optIndex}_Comment`]: contractData.addonComments[addon.name],
          });
        }
        optIndex++;
      }
    });
  }

  if (additionalScreens > 0 && optIndex <= 5) {
    const screenPrice =
      contractData.additionalScreenUnitCost !== undefined
        ? Number(contractData.additionalScreenUnitCost)
        : contractData.location.id === "saint-barthelemy"
        ? 20.0
        : 10.0;
    smartFieldsData.push(
      { [`Opt${optIndex}_Desc`]: "Écrans Supplémentaires" },
      {
        [`Opt${optIndex}_Monthly`]: formatCurrency(
          screenPrice,
          contractData.currency
        ),
      },
      { [`Opt${optIndex}_Qty`]: additionalScreens.toString() },
      {
        [`Opt${optIndex}_Comment`]: contractData.additionalScreensComment || "",
      },
      {
        [`Opt${optIndex}_Cost`]: formatCurrency(
          screenPrice * additionalScreens,
          contractData.currency
        ),
      }
    );
  }

  let equipIndex = 1;
  const pushEquip = (
    desc: string,
    cost: number,
    qty: number,
    comment: string
  ) => {
    if (cost >= 0 && equipIndex <= 6) {
      smartFieldsData.push(
        { [`Equip${equipIndex}_Desc`]: desc },
        {
          [`Equip${equipIndex}_Cost`]: formatCurrency(
            cost,
            contractData.currency
          ),
        },
        { [`Equip${equipIndex}_Qty`]: qty.toString() },
        { [`Equip${equipIndex}_Comment`]: comment || "" },
        {
          [`Equip${equipIndex}_Tot`]: formatCurrency(
            cost * qty,
            contractData.currency
          ),
        }
      );
      equipIndex++;
    }
  };

  const hasDynamicFees =
    contractData.selectedFees && contractData.selectedFees.length > 0;

  if (hasDynamicFees) {
    (contractData.selectedFees || []).forEach((fee) => {
      pushEquip(fee.name, Number(fee.price) || 0, 1, "");
    });
  }

  if (!hasDynamicFees) {
    if (contractData.connectionFeeEnabled)
      pushEquip(
        "Frais de mise en service",
        contractData.connectionFeeCost || 0,
        1,
        contractData.connectionFeeComment || ""
      );
    if (contractData.installFeeEnabled)
      pushEquip(
        "Installation standard",
        contractData.installFeeCost || 0,
        1,
        contractData.installFeeComment || ""
      );
  }

  if (
    contractData.selectedDecoders &&
    contractData.selectedDecoders.length > 0
  ) {
    contractData.selectedDecoders.forEach((decoder) => {
      if (Number(decoder.upfrontPrice) > 0 && equipIndex <= 6) {
        pushEquip(
          decoder.name,
          Number(decoder.upfrontPrice),
          decoder.quantity,
          contractData.decoderPurchaseComment || ""
        );
      }
    });
  } else if (
    contractData.decoderHardwareEnabled &&
    !contractData.decoderRental
  ) {
    const decoderTotalCost = contractData.decoderHardwareCost || 0;
    const unitPrice = totalScreens > 0 ? decoderTotalCost / totalScreens : 0;
    pushEquip(
      "Décodeur/télécommande",
      unitPrice,
      totalScreens,
      contractData.decoderPurchaseComment || ""
    );
  }

  if (contractData.satelliteDishEnabled)
    pushEquip(
      "Kit parabole",
      contractData.satelliteDishCost || 0,
      1,
      contractData.satelliteDishComment || ""
    );
  if (contractData.otherHardwareEnabled)
    pushEquip(
      contractData.otherHardwareName || "Autre Matériel",
      contractData.otherHardwareCost || 0,
      1,
      ""
    );
  if (contractData.otherHardware2Enabled)
    pushEquip(
      contractData.otherHardware2Name || "Autre Matériel 2",
      contractData.otherHardware2Cost || 0,
      1,
      ""
    );

  // if (contractData.autrePoncCost && contractData.autrePoncCost !== 0) {
  //   pushEquip(
  //     contractData.autrePoncText || "Divers Ponctuel",
  //     contractData.autrePoncCost,
  //     1,
  //     ""
  //   );
  // }

  if (contractData.customItemPrice && contractData.customItemPrice !== 0) {
    smartFieldsData.push(
      { Other_Monthly_Desc: contractData.customItemName || "Divers" },
      {
        Other_Monthly_Cost: formatCurrency(
          contractData.customItemPrice,
          contractData.currency
        ),
      }
    );
  }

  if (contractData.autrePoncCost && contractData.autrePoncCost !== 0) {
    smartFieldsData.push(
      { Other_OneTime_Desc: contractData.autrePoncText || "Divers Ponctuel" },
      {
        Other_OneTime_Cost: formatCurrency(
          contractData.autrePoncCost,
          contractData.currency
        ),
      }
    );
  }

  const costs = calculateCosts(contractData, contractData.customItemPrice || 0);
  const ponc_costs = calculatePoncCosts(
    contractData,
    contractData.autrePoncCost || 0
  );

  smartFieldsData.push(
    { Tax_Desc: contractData.taxDesc || "" },
    { Tax_Desc_Ponc: contractData.taxDesc || "" },
    { Tot_HT: costs.Tot_HT || "" },
    { Tot_Taxes: costs.Tot_Taxes || "" },
    { Tot_Mensuel: costs.Tot_Mensuel || "" },
    { Tot_HT_Ponc: ponc_costs.Tot_HT_Ponc || "" },
    { Tot_Taxes_Ponc: ponc_costs.Tot_Taxes_Ponc || "" },
    { Tot_Ponc: ponc_costs.Tot_Ponc || "" },
    { Tot_Recurring_Cost: costs.Tot_Mensuel || "" },
    { Tot_OneTime: ponc_costs.Tot_Ponc || "" }
  );

  const filteredSmartFieldsData = filterEmptyFields(smartFieldsData);
  await fetch(
    `${apiBase}/document/${documentId}/integration/object/smartfields`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: filteredSmartFieldsData,
        client_timestamp: Date.now(),
      }),
    }
  );
}

// Function to get document data
async function getDocumentData(
  accessToken: string,
  documentId: string
): Promise<any> {
  const apiBase = Deno.env.get("SIGNNOW_API_BASE_URL");

  const response = await fetch(`${apiBase}/document/${documentId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get document data: ${response.statusText}`);
  }

  return await response.json();
}

// Function to get document fields
async function getDocumentFields(documentData: any): Promise<Set<string>> {
  logger(LOG_LEVEL.VERBOSE, `Document data keys`, {
    keys: Object.keys(documentData),
  });

  const fieldNames = new Set<string>();

  if (documentData.fields && Array.isArray(documentData.fields)) {
    logger(
      LOG_LEVEL.VERBOSE,
      `Found fields array with ${documentData.fields.length} items`
    );
    documentData.fields.forEach((field: any) => {
      const name =
        field.json_attributes?.name ||
        field.field_name ||
        field.name ||
        field.label;
      if (name) fieldNames.add(name);
    });
  }

  if (documentData.checkboxes && Array.isArray(documentData.checkboxes)) {
    documentData.checkboxes.forEach((checkbox: any) => {
      const name =
        checkbox.json_attributes?.name ||
        checkbox.name ||
        checkbox.field_name ||
        checkbox.label;
      if (name) fieldNames.add(name);
    });
  }

  if (documentData.texts && Array.isArray(documentData.texts)) {
    documentData.texts.forEach((text: any) => {
      const name =
        text.json_attributes?.name ||
        text.field_name ||
        text.name ||
        text.label;
      if (name) fieldNames.add(name);
    });
  }

  return fieldNames;
}

async function prefillTextFields(
  accessToken: string,
  documentId: string,
  contractData: ContractRequest,
  availableFields: Set<string>
): Promise<void> {
  const apiBase = Deno.env.get("SIGNNOW_API_BASE_URL");
  const fields: Array<{ field_name: string; prefilled_text: string }> = [];

  const pushIfAvailable = (name: string, value: string) => {
    if (
      availableFields.has(name) &&
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      fields.push({ field_name: name, prefilled_text: value });
    }
  };

  // 1. Basic Demographics
  pushIfAvailable(
    "Proprio_Nom",
    `${contractData.subscriberInfo.firstName} ${contractData.subscriberInfo.lastName}`
  );
  pushIfAvailable(
    "Proprio_Cie",
    contractData.subscriberInfo.companyName || " "
  );
  pushIfAvailable(
    "Proprio_Logement",
    contractData.subscriberInfo.accommodationName || " "
  );
  pushIfAvailable("Proprio_Adresse", contractData.subscriberInfo.address);
  pushIfAvailable("Proprio_email", contractData.subscriberInfo.email);
  pushIfAvailable("Proprio_Cell", contractData.subscriberInfo.cellPhone);
  pushIfAvailable("Proprio_CP", contractData.subscriberInfo.postalCode);
  pushIfAvailable("Proprio_Ville", contractData.subscriberInfo.city);
  pushIfAvailable(
    "Proprio_Phone",
    contractData.subscriberInfo.landlinePhone || " "
  );

  const locId = contractData.location.id;
  pushIfAvailable(
    "Subscription_Region",
    locId === "saint-barthelemy"
      ? "Saint-Barthélemy"
      : locId === "sint-maarten"
      ? "Sint-Maarten"
      : "Saint-Martin"
  );

  if (contractData.partnerInfo?.firstName) {
    pushIfAvailable(
      "Mgr_Nom",
      `${contractData.partnerInfo.firstName} ${contractData.partnerInfo.lastName}`
    );
    pushIfAvailable("Mgr_Cell", contractData.partnerInfo.cellPhone);
    pushIfAvailable("Mgr_Cie", contractData.partnerInfo.companyName || " ");
    pushIfAvailable("Mgr_Adresse", contractData.partnerInfo.address);
    pushIfAvailable("Mgr_email", contractData.partnerInfo.email);
    pushIfAvailable("Mgr_CP", contractData.partnerInfo.postalCode);
    pushIfAvailable("Mgr_Ville", contractData.partnerInfo.city);
  }

  if (contractData.guarantorInfo?.firstName) {
    pushIfAvailable(
      "DAF_Nom",
      `${contractData.guarantorInfo.firstName} ${contractData.guarantorInfo.lastName}`
    );
    pushIfAvailable("DAF_Cell", contractData.guarantorInfo.cellPhone);
    pushIfAvailable(
      "DAF_Phone",
      contractData.guarantorInfo.landlinePhone || " "
    );
    pushIfAvailable("DAF_email", contractData.guarantorInfo.email);
  }
  // ✅ ADD THIS NEW BLOCK FOR DELIVERY INFO
  if (contractData.deliveryInfo?.address) {
    pushIfAvailable("Livraison_Adresse", contractData.deliveryInfo.address);
    pushIfAvailable("Livraison_Ville", contractData.deliveryInfo.city);
    pushIfAvailable("Livraison_CP", contractData.deliveryInfo.postalCode);
    pushIfAvailable("Livraison_Cell", contractData.deliveryInfo.cellPhone);
  }
  const planQty = contractData.planQuantity || 1;
  const additionalScreens = contractData.additionalScreens || 0;
  const totalScreens = planQty + additionalScreens;

  pushIfAvailable("Total_Screens", totalScreens.toString());
  pushIfAvailable("Tot_screens", totalScreens.toString());

  let packIndex = 1;
  const planPrice = contractData.selectedPlan.price || 0;
  const displayPlanName = contractData.selectedPlan.name;

  pushIfAvailable(`Pack${packIndex}_Desc`, displayPlanName);
  pushIfAvailable(
    `Pack${packIndex}_Monthly`,
    planPrice > 0 ? formatCurrency(planPrice, contractData.currency) : ""
  );
  pushIfAvailable(`Pack${packIndex}_Qty`, planQty.toString());
  pushIfAvailable(`Pack${packIndex}_Comment`, contractData.planComment || "");
  pushIfAvailable(
    `Pack${packIndex}_Cost`,
    formatCurrency(planPrice * planQty, contractData.currency)
  );
  packIndex++;

  if (
    contractData.selectedDecoders &&
    contractData.selectedDecoders.length > 0
  ) {
    contractData.selectedDecoders.forEach((decoder) => {
      if (Number(decoder.monthlyPrice) > 0 && packIndex <= 3) {
        pushIfAvailable(`Pack${packIndex}_Desc`, decoder.name);
        pushIfAvailable(
          `Pack${packIndex}_Monthly`,
          formatCurrency(Number(decoder.monthlyPrice), contractData.currency)
        );
        pushIfAvailable(`Pack${packIndex}_Qty`, decoder.quantity.toString());
        pushIfAvailable(
          `Pack${packIndex}_Comment`,
          contractData.decoderRentalComment || ""
        );
        pushIfAvailable(
          `Pack${packIndex}_Cost`,
          formatCurrency(
            Number(decoder.monthlyPrice) * decoder.quantity,
            contractData.currency
          )
        );
        packIndex++;
      }
    });
  } else if (contractData.decoderRental) {
    const rentalPrice =
      contractData.location.id === "saint-barthelemy" ? 10.0 : 6.0;
    pushIfAvailable(`Pack${packIndex}_Desc`, "Location Décodeur");
    pushIfAvailable(
      `Pack${packIndex}_Monthly`,
      formatCurrency(rentalPrice, contractData.currency)
    );
    pushIfAvailable(`Pack${packIndex}_Qty`, totalScreens.toString());
    pushIfAvailable(
      `Pack${packIndex}_Comment`,
      contractData.decoderRentalComment || ""
    );
    pushIfAvailable(
      `Pack${packIndex}_Cost`,
      formatCurrency(rentalPrice * totalScreens, contractData.currency)
    );
    packIndex++;
  }

  let optIndex = 1;
  if (contractData.addons && contractData.addons.length > 0) {
    contractData.addons.forEach((addon) => {
      if (optIndex <= 5) {
        const addonPrice = addon.price || 0;
        // 🚨 FIX: Safely check for quantity so '0' doesn't evaluate to false
        const addonQty =
          addon.quantity !== undefined && addon.quantity !== null
            ? addon.quantity
            : planQty;

        pushIfAvailable(`Opt${optIndex}_Desc`, addon.name);
        pushIfAvailable(
          `Opt${optIndex}_Monthly`,
          addonPrice > 0
            ? formatCurrency(addonPrice, contractData.currency)
            : ""
        );
        pushIfAvailable(`Opt${optIndex}_Qty`, addonQty.toString());
        pushIfAvailable(
          `Opt${optIndex}_Cost`,
          formatCurrency(addonPrice * addonQty, contractData.currency)
        );
        if (
          contractData.addonComments &&
          contractData.addonComments[addon.name]
        ) {
          pushIfAvailable(
            `Opt${optIndex}_Comment`,
            contractData.addonComments[addon.name]
          );
        }
        optIndex++;
      }
    });
  }

  if (additionalScreens > 0 && optIndex <= 5) {
    const screenPrice =
      contractData.additionalScreenUnitCost !== undefined
        ? Number(contractData.additionalScreenUnitCost)
        : contractData.location.id === "saint-barthelemy"
        ? 20.0
        : 10.0;
    pushIfAvailable(`Opt${optIndex}_Desc`, "Écrans Supplémentaires");
    pushIfAvailable(
      `Opt${optIndex}_Monthly`,
      formatCurrency(screenPrice, contractData.currency)
    );
    pushIfAvailable(`Opt${optIndex}_Qty`, additionalScreens.toString());
    pushIfAvailable(
      `Opt${optIndex}_Comment`,
      contractData.additionalScreensComment || ""
    );
    pushIfAvailable(
      `Opt${optIndex}_Cost`,
      formatCurrency(screenPrice * additionalScreens, contractData.currency)
    );
  }

  let equipIndex = 1;
  const pushEquip = (
    desc: string,
    cost: number,
    qty: number,
    comment: string
  ) => {
    if (cost >= 0 && equipIndex <= 6) {
      pushIfAvailable(`Equip${equipIndex}_Desc`, desc);
      pushIfAvailable(
        `Equip${equipIndex}_Cost`,
        formatCurrency(cost, contractData.currency)
      );
      pushIfAvailable(`Equip${equipIndex}_Qty`, qty.toString());
      pushIfAvailable(`Equip${equipIndex}_Comment`, comment || "");
      pushIfAvailable(
        `Equip${equipIndex}_Tot`,
        formatCurrency(cost * qty, contractData.currency)
      );
      equipIndex++;
    }
  };

  const hasDynamicFees =
    contractData.selectedFees && contractData.selectedFees.length > 0;

  if (hasDynamicFees) {
    (contractData.selectedFees || []).forEach((fee) => {
      pushEquip(fee.name, Number(fee.price) || 0, 1, "");
    });
  }

  if (!hasDynamicFees) {
    if (contractData.connectionFeeEnabled)
      pushEquip(
        "Frais de mise en service",
        contractData.connectionFeeCost || 0,
        1,
        contractData.connectionFeeComment || ""
      );
    if (contractData.installFeeEnabled)
      pushEquip(
        "Installation standard",
        contractData.installFeeCost || 0,
        1,
        contractData.installFeeComment || ""
      );
  }

  if (
    contractData.selectedDecoders &&
    contractData.selectedDecoders.length > 0
  ) {
    contractData.selectedDecoders.forEach((decoder) => {
      if (Number(decoder.upfrontPrice) > 0 && equipIndex <= 6) {
        pushEquip(
          decoder.name,
          Number(decoder.upfrontPrice),
          decoder.quantity,
          contractData.decoderPurchaseComment || ""
        );
      }
    });
  } else if (
    contractData.decoderHardwareEnabled &&
    !contractData.decoderRental
  ) {
    const decoderTotalCost = contractData.decoderHardwareCost || 0;
    const unitPrice = totalScreens > 0 ? decoderTotalCost / totalScreens : 0;
    pushEquip(
      "Décodeur/télécommande",
      unitPrice,
      totalScreens,
      contractData.decoderPurchaseComment || ""
    );
  }

  if (contractData.satelliteDishEnabled)
    pushEquip(
      "Kit parabole",
      contractData.satelliteDishCost || 0,
      1,
      contractData.satelliteDishComment || ""
    );
  if (contractData.otherHardwareEnabled)
    pushEquip(
      contractData.otherHardwareName || "Autre Matériel",
      contractData.otherHardwareCost || 0,
      1,
      ""
    );
  if (contractData.otherHardware2Enabled)
    pushEquip(
      contractData.otherHardware2Name || "Autre Matériel 2",
      contractData.otherHardware2Cost || 0,
      1,
      ""
    );

  // if (contractData.autrePoncCost && contractData.autrePoncCost !== 0) {
  //   pushEquip(
  //     contractData.autrePoncText || "Divers Ponctuel",
  //     contractData.autrePoncCost,
  //     1,
  //     ""
  //   );
  // }
  if (contractData.customItemPrice && contractData.customItemPrice !== 0) {
    pushIfAvailable(
      "Other_Monthly_Desc",
      contractData.customItemName || "Divers"
    );
    pushIfAvailable(
      "Other_Monthly_Cost",
      formatCurrency(contractData.customItemPrice, contractData.currency)
    );
  }

  if (contractData.autrePoncCost && contractData.autrePoncCost !== 0) {
    pushIfAvailable(
      "Other_OneTime_Desc",
      contractData.autrePoncText || "Divers Ponctuel"
    );
    pushIfAvailable(
      "Other_OneTime_Cost",
      formatCurrency(contractData.autrePoncCost, contractData.currency)
    );
  }

  const costs = calculateCosts(contractData, contractData.customItemPrice || 0);
  const ponc_costs = calculatePoncCosts(
    contractData,
    contractData.autrePoncCost || 0
  );

  pushIfAvailable("Tax_Desc", contractData.taxDesc || "");
  pushIfAvailable("Tax_Desc_Ponc", contractData.taxDesc || "");
  pushIfAvailable("Tot_HT", costs.Tot_HT || "");
  pushIfAvailable("Tot_Taxes", costs.Tot_Taxes || "");
  pushIfAvailable("Tot_Mensuel", costs.Tot_Mensuel || "");
  pushIfAvailable("Tot_HT_Ponc", ponc_costs.Tot_HT_Ponc || "");
  pushIfAvailable("Tot_Taxes_Ponc", ponc_costs.Tot_Taxes_Ponc || "");
  pushIfAvailable("Tot_Ponc", ponc_costs.Tot_Ponc || "");
  pushIfAvailable("Tot_Recurring_Cost", costs.Tot_Mensuel || "");
  pushIfAvailable("Tot_OneTime", ponc_costs.Tot_Ponc || "");
  const response = await fetch(
    `${apiBase}/v2/documents/${documentId}/prefill-texts`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to prefill text fields: ${error}`);
  }
}

async function prefillCheckboxFields(
  accessToken: string,
  documentId: string,
  contractData: ContractRequest,
  documentData: any
): Promise<void> {
  const apiBase = Deno.env.get("SIGNNOW_API_BASE_URL");

  const checkboxFields = documentData.checks || [];

  if (checkboxFields.length === 0) return;

  const mktingCheckbox = checkboxFields.find((check: any) => {
    const fieldName = check.json_attributes?.name || check.name || "";
    return fieldName === "Mkting_OK";
  });

  if (!mktingCheckbox) return;

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
}

async function createDocumentFromTemplate(
  accessToken: string,
  contractData: ContractRequest,
  templateIdOverride?: string
): Promise<string> {
  const apiBase = Deno.env.get("SIGNNOW_API_BASE_URL");

  const templateId =
    templateIdOverride || getTemplateIdForLocation(contractData.location.id);

  if (!templateId) {
    throw new Error(
      `No template configured for location: ${contractData.location.id}`
    );
  }

  const copyResponse = await fetch(`${apiBase}/template/${templateId}/copy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      document_name: `Contract_${
        contractData.subscriberInfo.lastName
      }_${Date.now()}`,
    }),
  });

  if (!copyResponse.ok) {
    const error = await copyResponse.text();
    console.error("Template copy error:", error);
    throw new Error(`Failed to create document from template: ${error}`);
  }

  const copyData = await copyResponse.json();
  return copyData.id;
}

async function processSepaMandate(
  accessToken: string,
  contractData: ContractRequest
): Promise<string> {
  let sepaTemplateId: string | undefined;
  if (contractData.location.id === "saint-martin") {
    sepaTemplateId = Deno.env.get("SIGNNOW_SEPA_SFG_TEMPLATE_ID");
  } else {
    sepaTemplateId = Deno.env.get("SIGNNOW_SEPA_TEMPLATE_ID");
  }
  if (!sepaTemplateId) {
    throw new Error("SEPA template not configured");
  }

  const sepaDocumentId = await createSepaDocument(
    accessToken,
    contractData,
    sepaTemplateId
  );
  return sepaDocumentId;
}

async function processCcAuthorization(
  accessToken: string,
  contractData: ContractRequest
): Promise<string> {
  const ccAuthTemplateId = Deno.env.get("SIGNNOW_CC_AUTHORIZATION_TEMPLATE_ID");
  if (!ccAuthTemplateId) {
    throw new Error("CC Authorization template not configured");
  }

  const ccAuthDocumentId = await createCcAuthDocument(
    accessToken,
    contractData,
    ccAuthTemplateId
  );
  return ccAuthDocumentId;
}

async function createCcAuthDocument(
  accessToken: string,
  contractData: ContractRequest,
  templateId: string
): Promise<string> {
  const apiBase = Deno.env.get("SIGNNOW_API_BASE_URL");

  const copyResponse = await fetch(`${apiBase}/template/${templateId}/copy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      document_name: `CC_Authorization_${
        contractData.subscriberInfo.lastName
      }_${Date.now()}`,
    }),
  });

  if (!copyResponse.ok) {
    const error = await copyResponse.text();
    console.error("CC Authorization template copy error:", error);
    throw new Error("Failed to create CC Authorization document");
  }

  const copyData = await copyResponse.json();
  const ccAuthDocumentId = copyData.id;

  await prefillCcAuthDocument(accessToken, ccAuthDocumentId, contractData);
  return ccAuthDocumentId;
}

async function prefillCcAuthDocument(
  accessToken: string,
  documentId: string,
  contractData: ContractRequest
): Promise<void> {
  const apiBase = Deno.env.get("SIGNNOW_API_BASE_URL");

  const fullName =
    `${contractData.subscriberInfo.firstName} ${contractData.subscriberInfo.lastName}`.trim();
  const companyName = contractData.subscriberInfo.companyName || " ";

  const ccAuthFields: Array<Record<string, string>> = [
    { CC_Name: fullName },
    { CC_CompanyName: companyName },
    { CC_Adresse: contractData.subscriberInfo.address },
    { CC_CP: contractData.subscriberInfo.postalCode },
    { CC_City: contractData.subscriberInfo.city },
    { CC_Country: contractData.subscriberInfo.country || " " },
  ];

  const response = await fetch(
    `${apiBase}/document/${documentId}/integration/object/smartfields`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_timestamp: Date.now(),
        data: ccAuthFields,
      }),
    }
  );

  if (!response.ok) {
    console.log("Continuing without prefill...");
  }
}

async function createSepaDocument(
  accessToken: string,
  contractData: ContractRequest,
  templateId: string
): Promise<string> {
  const apiBase = Deno.env.get("SIGNNOW_API_BASE_URL");

  const copyResponse = await fetch(`${apiBase}/template/${templateId}/copy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      document_name: `SEPA_Mandate_${
        contractData.subscriberInfo.lastName
      }_${Date.now()}`,
    }),
  });

  if (!copyResponse.ok) {
    const error = await copyResponse.text();
    throw new Error("Failed to create SEPA document");
  }

  const copyData = await copyResponse.json();
  const sepaDocumentId = copyData.id;

  await prefillSepaDocument(accessToken, sepaDocumentId, contractData);
  return sepaDocumentId;
}

async function prefillSepaDocument(
  accessToken: string,
  documentId: string,
  contractData: ContractRequest
): Promise<void> {
  const apiBase = Deno.env.get("SIGNNOW_API_BASE_URL");

  const firstName =
    contractData.sepaData?.firstName || contractData.subscriberInfo.firstName;
  const lastName =
    contractData.sepaData?.lastName || contractData.subscriberInfo.lastName;
  const fullName = `${firstName} ${lastName}`.trim();

  const companyName =
    contractData.sepaData?.companyName ||
    contractData.subscriberInfo.companyName ||
    " ";

  const sepaFields: Array<Record<string, string>> = [
    { SEPA_Name: fullName },
    { SEPA_CompanyName: companyName },
    {
      SEPA_Adresse:
        contractData.sepaData?.address || contractData.subscriberInfo.address,
    },
    {
      SEPA_CP:
        contractData.sepaData?.postalCode ||
        contractData.subscriberInfo.postalCode,
    },
    {
      SEPA_City:
        contractData.sepaData?.city || contractData.subscriberInfo.city,
    },
    {
      SEPA_Country:
        contractData.sepaData?.country ||
        contractData.subscriberInfo.country ||
        " ",
    },
    { SEPA_IBAN: contractData.sepaData?.iban || " " },
    { SEPA_BIC: contractData.sepaData?.bic || " " },
    { SEPA_Recurrent: contractData.sepaData?.paymentRecurrent ? "X" : " " },
    { SEPA_Ponctuel: contractData.sepaData?.paymentPonctuel ? "X" : " " },
    { SEPA_RUM: contractData.sepaData?.rum || " " },
    { SEPA_ContractRef: contractData.sepaData?.contractReference || " " },
  ];

  const response = await fetch(
    `${apiBase}/document/${documentId}/integration/object/smartfields`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_timestamp: Date.now(),
        data: sepaFields,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error("Failed to prefill SEPA document");
  }
}

async function mergeDocuments(
  accessToken: string,
  documentIds: string[],
  contractData: ContractRequest
): Promise<string> {
  const apiBase = Deno.env.get("SIGNNOW_API_BASE_URL");

  const response = await fetch(`${apiBase}/document/merge`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `IDEAL TV ${contractData.subscriberInfo.lastName}, ${
        contractData.subscriberInfo.firstName
      }_${new Date().toISOString().split("T")[0]}`,
      document_ids: documentIds,
      upload_document: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorDetails;
    try {
      errorDetails = JSON.parse(errorText);
    } catch {
      errorDetails = errorText;
    }
    throw new Error(
      `Failed to merge documents: ${JSON.stringify(errorDetails)}`
    );
  }

  const mergedoc = await response.json();

  const documentId =
    mergedoc.id ||
    mergedoc.document_id ||
    mergedoc.document_group_id ||
    mergedoc.data?.id ||
    mergedoc.data?.document_id;

  if (!documentId) {
    throw new Error("Merge succeeded but document ID not found in response");
  }

  return documentId;
}

async function mergeSigners(
  accessToken: string,
  documentId: string
): Promise<void> {
  const apiBase = Deno.env.get("SIGNNOW_API_BASE_URL");

  const documentData = await getDocumentData(accessToken, documentId);

  let targetRoleName = "Recipient 1";
  let targetRoleId = "";

  if (documentData.roles && documentData.roles.length > 0) {
    const recipient1 = documentData.roles.find(
      (r: any) => r.name === "Recipient 1"
    );
    if (recipient1) {
      targetRoleId = recipient1.unique_id;
    } else {
      targetRoleName = documentData.roles[0].name;
      targetRoleId = documentData.roles[0].unique_id;
    }
  }

  if (!targetRoleId && documentData.fields) {
    const field =
      documentData.fields.find((f: any) => f.role === targetRoleName) ||
      documentData.fields[0];
    if (field) {
      targetRoleName = field.role;
      targetRoleId = field.role_id;
    }
  }

  if (!targetRoleId) return;

  const unifiedFields: any[] = [];

  if (documentData.fields && Array.isArray(documentData.fields)) {
    documentData.fields.forEach((field: any, index: number) => {
      const attrs = field.json_attributes || {};
      const fieldDef: any = {
        ...attrs,
        type: field.type,
        role: targetRoleName,
        role_id: targetRoleId,
        name: attrs.name || field.name || `Field_${index}`,
      };
      unifiedFields.push(fieldDef);
    });
  }

  const updatePayload = { fields: unifiedFields };

  const response = await fetch(`${apiBase}/document/${documentId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updatePayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to merge signer roles: ${errorText}`);
  }
}

async function assignBrandToDocument(
  accessToken: string,
  documentId: string,
  brandId: string,
  contractData?: ContractRequest
): Promise<void> {
  const apiBase = Deno.env.get("SIGNNOW_API_BASE_URL");

  const response = await fetch(`${apiBase}/v2/documents/${documentId}/brand`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      brand_id: brandId,
      locale: "fr",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to assign brand: ${errorText}`);
  }
}

async function assignRoutingDetails(
  accessToken: string,
  documentId: string,
  ownerEmail: string,
  approverEmail: string,
  approverName: string
): Promise<void> {
  const apiBase = Deno.env.get("SIGNNOW_API_BASE_URL");

  const documentData = await getDocumentData(accessToken, documentId);

  let roleId: string | null = null;
  let roleName: string | null = null;

  if (
    documentData.fields &&
    Array.isArray(documentData.fields) &&
    documentData.fields.length > 0
  ) {
    const firstField = documentData.fields[0];
    roleId = firstField.role_id || firstField.json_attributes?.role_id;
    roleName = firstField.role || firstField.json_attributes?.role;
  }

  if (
    !roleId &&
    documentData.signatures &&
    Array.isArray(documentData.signatures) &&
    documentData.signatures.length > 0
  ) {
    const firstSig = documentData.signatures[0];
    roleId = firstSig.role_id;
    roleName = firstSig.role;
  }

  if (!roleId) throw new Error("Role ID not found in merged document");

  const routingPayload: any = {
    cc_step: {},
    invite_link_instructions: {},
    template_data: [
      {
        decline_by_signature: false,
        default_email: ownerEmail,
        inviter_role: false,
        role_id: roleId,
        name: roleName || "Recipient 1",
        signing_order: 1,
        sender_email: approverEmail,
        sender_name: approverName,
        first_name: "Cestmoi",
        last_name: "LeGars",
        language: "fr",
        prefill_signature_name: "Mezigue tatoin",
      },
    ],
  };

  const response = await fetch(
    `${apiBase}/document/${documentId}/template/routing/detail`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(routingPayload),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to assign routing details: ${errorText}`);
  }
}

async function assignRoutingDetailsForApprover(
  accessToken: string,
  documentId: string,
  approverEmail: string,
  approverFirstName: string,
  approverLastName: string,
  signerEmail: string,
  signerFirstName: string,
  signerLastName: string,
  ccEmail?: string
): Promise<void> {
  const apiBase = Deno.env.get("SIGNNOW_API_BASE_URL");

  const documentData = await getDocumentData(accessToken, documentId);

  const roles: { [key: string]: string } = {};

  if (documentData.fields && Array.isArray(documentData.fields)) {
    documentData.fields.forEach((field: any) => {
      if (field.role && field.role_id) {
        roles[field.role] = field.role_id;
      }
    });
  }

  const approverRoleId = roles["Approver"] || roles["approver"];
  const signerRoleId =
    roles["Signer"] || roles["signer"] || roles["Recipient 1"];

  if (!approverRoleId || !signerRoleId) {
    throw new Error(`Missing required roles. Need: Approver and Signer`);
  }

  const routingPayload: any = {
    cc_step: {},
    invite_link_instructions: {},
    template_data: [
      {
        decline_by_signature: false,
        default_email: approverEmail,
        inviter_role: false,
        role_id: approverRoleId,
        name: "Approver",
        signing_order: 1,
        first_name: approverFirstName,
        last_name: approverLastName,
        prefill_signature_name: `${approverFirstName} ${approverLastName}`,
      },
      {
        decline_by_signature: false,
        default_email: signerEmail,
        inviter_role: false,
        role_id: signerRoleId,
        name: "Signer",
        signing_order: 2,
        first_name: signerFirstName,
        last_name: signerLastName,
        prefill_signature_name: `${signerFirstName} ${signerLastName}`,
      },
    ],
  };

  if (ccEmail) routingPayload.cc = [ccEmail];

  const response = await fetch(
    `${apiBase}/document/${documentId}/template/routing/detail`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(routingPayload),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to assign approver routing: ${errorText}`);
  }
}

async function sendSigningLink(
  accessToken: string,
  documentId: string,
  subscriberEmail: string,
  contractData: ContractRequest
): Promise<string> {
  const apiBase = Deno.env.get("SIGNNOW_API_BASE_URL");

  const subscriberPhone = contractData.subscriberInfo.cellPhone;
  const approverName = contractData.approverName;
  const approverEmail = contractData.approverEmail;
  const financeCcEmail = Deno.env.get("SIGNNOW_FINANCE_CC_EMAIL");

  const cc: string[] = [];
  if (financeCcEmail) cc.push(financeCcEmail.trim());
  if (approverEmail) cc.push(approverEmail.trim());

  const payload = {
    document_id: documentId,
    from: approverEmail,
    to: [
      {
        email: subscriberEmail,
        role: "Recipient 1",
        order: 1,
        expiration_days: 30,
        reminder: 0,
        authentication_type: "phone",
        method: "sms",
        phone: subscriberPhone,
        authentication_sms_message:
          "Your IDEAL TV verification code is {password}",
        subject: `Please sign your IDEAL TV Subscription`,
        message: `Hi,\n\n${approverName} (${approverEmail}) has requested you to sign your IDEAL TV subscription agreement.`,
      },
    ],
    cc,
  };

  const response = await fetch(`${apiBase}/document/${documentId}/invite`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = "SignNow invite failed";
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.errors && errorJson.errors[0]?.message) {
        errorMessage = errorJson.errors[0].message;
      }
    } catch {
      errorMessage = errorText;
    }
    throw new Error(errorMessage);
  }

  return `Signing invite sent to ${subscriberEmail}`;
}

async function getSenderPreviewUrl(
  accessToken: string,
  documentId: string,
  frontendUrl?: string
): Promise<string> {
  const apiBase = Deno.env.get("SIGNNOW_API_BASE_URL");
  const url = `${apiBase}/v2/documents/${documentId}/embedded-view`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      redirect_uri: `${frontendUrl}/close-view.html?session=${Date.now()}`,
      redirect_target: "self",
      link_expiration: 45200,
    }),
  });

  const result = await response.json();
  const previewLink = result.data?.link || result.link || result.url;

  if (!previewLink) {
    throw new Error(
      result.errors?.[0]?.message || "Failed to generate read-only preview link"
    );
  }

  return previewLink;
}

async function getEmbedView(
  accessToken: string,
  documentId: string,
  recipientEmail: string,
  fromname: string,
  frommail: string,
  frontendUrl?: string
): Promise<string> {
  const apiBase = Deno.env.get("SIGNNOW_API_BASE_URL");

  const redirectUri = frontendUrl
    ? `${frontendUrl}/contract-signing-bridge`
    : `${Deno.env
        .get("SUPABASE_URL")
        ?.replace("/rest/v1", "")}/contract-signing-bridge`;

  const embedVResponse = await fetch(
    `${apiBase}/v2/documents/${documentId}/embedded-sending`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "invite",
        redirect_uri: redirectUri,
        link_expiration: 15,
        redirect_target: "self",
        from_email: frommail,
        from_name: fromname,
        invites: [
          {
            email: recipientEmail,
            role: "Recipient 1",
            order: 1,
            expiration_days: 30,
            reminder: 0,
            language: "fr",
          },
        ],
      }),
    }
  );

  if (!embedVResponse.ok) {
    throw new Error("Failed to get embed view");
  }

  const embedVData = await embedVResponse.json();
  const embedUrl =
    embedVData.data?.url ||
    embedVData.data?.link ||
    embedVData.url ||
    embedVData.link;

  if (!embedUrl) {
    throw new Error("SignNow did not return an embed URL");
  }

  return embedUrl;
}

async function generateKioskSigningLink(
  accessToken: string,
  documentId: string,
  contractData: ContractRequest
): Promise<string> {
  const apiBase = Deno.env.get("SIGNNOW_API_BASE_URL");

  const docResponse = await fetch(`${apiBase}/document/${documentId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!docResponse.ok) {
    const errText = await docResponse.text();
    throw new Error(
      `SignNow API Error (Doc Fetch): ${
        docResponse.status
      } - ${errText.substring(0, 100)}`
    );
  }
  const docData = await docResponse.json();

  let masterRoleName = "Recipient 1";
  let masterRoleId = "";

  if (docData.roles) {
    const r1 = docData.roles.find((r: any) => r.name === "Recipient 1");
    if (r1) {
      masterRoleId = r1.unique_id || r1.id;
    } else if (docData.roles.length > 0) {
      masterRoleName = docData.roles[0].name;
      masterRoleId = docData.roles[0].unique_id || docData.roles[0].id;
    }
  }

  if (masterRoleId && docData.fields) {
    const unifiedFields: any[] = [];
    docData.fields.forEach((field: any) => {
      unifiedFields.push({
        id: field.id,
        ...field.json_attributes,
        type: field.type,
        role: masterRoleName,
        role_id: masterRoleId,
        name: field.json_attributes?.name || field.name,
      });
    });

    if (unifiedFields.length > 0) {
      await fetch(`${apiBase}/document/${documentId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields: unifiedFields }),
      });
    }
  }
  const baseUrl = contractData.frontendUrl || Deno.env.get("FRONTEND_BASE_URL");

  const payload = {
    invites: [
      {
        email: contractData.subscriberInfo.email,
        role: masterRoleName,
        order: 1,
        // 1. Set metadata auth_method to "none" (required for V2 string validation)
        auth_method: "none",

        first_name: contractData.subscriberInfo.firstName,
        last_name: contractData.subscriberInfo.lastName,
        redirect_uri: `${baseUrl.replace(/\/$/, "")}/contract-signing-bridge`,

        // 2. Use delivery_type for V2 email triggering
        delivery_type: "email",

        // 3. NESTED AUTHENTICATION OBJECT: This enables the actual SMS 2FA challenge
        authentication: {
          type: "phone",
          method: "sms",
          phone: contractData.subscriberInfo.cellPhone, // Ensure format is +1XXXXXXXXXX
          // sms_message: "Your IDEAL TV verification code is {password}",
        },
      },
    ],
  };

  const response = await fetch(
    `${apiBase}/v2/documents/${documentId}/embedded-invites`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    logger(
      LOG_LEVEL.ERROR,
      `[CLIENT DEBUG] Failing Endpoint: ${apiBase}/v2/documents/${documentId}/embedded-invites`
    );
    logger(LOG_LEVEL.ERROR, `[CLIENT DEBUG] Token Used: ${accessToken}`);

    throw new Error(
      `SignNow API Error (Invite): ${response.status} - ${errText.substring(
        0,
        100
      )}`
    );
  }

  const data = await response.json();

  // if (!response.ok) {
  //   const errMsg = data.errors?.[0]?.message || JSON.stringify(data);
  //   throw new Error(`Failed to generate Kiosk link: ${errMsg}`);
  // }

  const inviteId = data.data?.[0]?.id;
  if (!inviteId) throw new Error("Invite created but no ID returned.");

  // ============================================================
  // GENERATE THE LINK (Must use the same auth_method: "none")
  // ============================================================
  const linkResponse = await fetch(
    `${apiBase}/v2/documents/${documentId}/embedded-invites/${inviteId}/link`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_method: "none", // MUST match the creation call above
        link_expiration: 45,
      }),
    }
  );
  if (!linkResponse.ok) {
    const errText = await linkResponse.text();
    logger(
      LOG_LEVEL.ERROR,
      `[CLIENT DEBUG] Failing Endpoint: ${apiBase}/v2/documents/${documentId}/embedded-invites/${inviteId}/link`
    );
    logger(LOG_LEVEL.ERROR, `[CLIENT DEBUG] Token Used: ${accessToken}`);

    throw new Error(
      `SignNow API Error (Link Gen): ${
        linkResponse.status
      } - ${errText.substring(0, 100)}`
    );
  }

  const linkData = await linkResponse.json();
  const signingLink = linkData.data?.link || linkData.link;

  if (!signingLink) {
    throw new Error(`SignNow created invite but refused to return a link.`);
  }

  return signingLink;
}
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contractData: ContractRequest & {
      databaseContext?: any;
      versionId?: string;
    } = await req.json();

    // ============================================================
    // NEW FIX: NORMALIZE LOCATION DATA
    if (typeof contractData.location === "string") {
      contractData.location = {
        id: contractData.location,
        address: "",
        city: "",
        postalCode: "",
      };
    }

    // // ============================================================
    // // 🌍 EDGE TRUTH: FETCH SCREEN COST DIRECTLY FROM DATABASE
    // // ============================================================
    // let screenCostToUse: number | undefined = undefined;
    // try {
    //   const supabaseUrl = Deno.env.get("SUPABASE_URL");
    //   const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    //   if (supabaseUrl && supabaseKey) {
    //     const { createClient } = await import(
    //       "https://esm.sh/@supabase/supabase-js@2"
    //     );
    //     const supabase = createClient(supabaseUrl, supabaseKey);

    //     // Fetch all locations (tiny table, very fast)
    //     const { data: locations } = await supabase
    //       .from("locations")
    //       .select("id, name, state_province, additional_screen_cost");

    //     if (locations && locations.length > 0) {
    //       const locIdStr = (contractData.location?.id || "").toLowerCase();

    //       // Robust matching to handle "saint-barthelemy" vs "SBH - Saint Barthélemy"
    //       const match = locations.find((loc) => {
    //         const dbName = (loc.name || "").toLowerCase();
    //         const dbState = (loc.state_province || "").toLowerCase();

    //         if (
    //           locIdStr.includes("barth") &&
    //           (dbState === "sbh" || dbName.includes("barth"))
    //         )
    //           return true;
    //         if (
    //           locIdStr.includes("martin") &&
    //           (dbState === "sxm" || dbName.includes("martin"))
    //         )
    //           return true;
    //         if (
    //           locIdStr.includes("maarten") &&
    //           (dbState === "sxm" || dbName.includes("maarten"))
    //         )
    //           return true;

    //         return loc.id.toString() === locIdStr || dbName === locIdStr;
    //       });

    //       if (match && match.additional_screen_cost !== null) {
    //         screenCostToUse = Number(match.additional_screen_cost);
    //         console.log(
    //           `🌍 [EDGE TRUTH] Found Location: ${match.name} | Screen Cost: ${screenCostToUse}`
    //         );
    //       }
    //     }
    //   }
    // } catch (dbError: any) {
    //   console.log(
    //     "⚠️ [EDGE TRUTH] Failed to fetch locations, using fallbacks.",
    //     dbError.message
    //   );
    // }

    // // Apply the fetched truth to the payload so all PDF functions use it
    // if (screenCostToUse !== undefined) {
    //   contractData.additionalScreenUnitCost = screenCostToUse;
    // }
    // // ============================================================

    // 🚨 RESTORE THESE MISSING LINES 🚨
    // --- 1. EXTRACT IDs CORRECTLY ---
    const subscriptionId =
      contractData.subscriptionId ||
      contractData.databaseContext?.subscriptionId;
    const versionId =
      contractData.versionId || contractData.databaseContext?.versionId;
    // ============================================================
    // SECURE PRICING HYDRATION (Trust but Verify)
    // ============================================================
    // Bypass hydration for Hotels because they use volume/custom pricing
    const isHotelContract =
      contractData.planInfo?.contractType === "hotel" ||
      contractData.contractType === "hotel";

    if (
      contractData.action !== "download" &&
      contractData.action !== "email_copy" &&
      !isHotelContract // <--- ADD THIS CHECK
    ) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (supabaseUrl && supabaseKey) {
          const { createClient } = await import(
            "https://esm.sh/@supabase/supabase-js@2"
          );
          const supabase = createClient(supabaseUrl, supabaseKey);

          // 1. Securely fetch Base Plan Price
          if (contractData.selectedPlan?.name) {
            const { data: planData } = await supabase
              .from("packages")
              .select("price")
              .eq("name", contractData.selectedPlan.name)
              .single();

            if (planData && planData.price) {
              contractData.selectedPlan.price = Number(planData.price);
            }
          }

          // 2. Securely fetch Addon Prices
          if (contractData.addons && contractData.addons.length > 0) {
            const addonNames = contractData.addons.map((a) => a.name);
            const { data: addonData } = await supabase
              .from("packages")
              .select("name, price")
              .in("name", addonNames);

            if (addonData && addonData.length > 0) {
              contractData.addons = contractData.addons.map((addon) => {
                const secureAddon = addonData.find(
                  (a) => a.name === addon.name
                );
                return {
                  ...addon,
                  price: secureAddon ? Number(secureAddon.price) : addon.price,
                };
              });
            }
          }
        }
      } catch (hydrationError) {
        console.warn(
          "[SECURITY] Could not hydrate secure prices, falling back to frontend payload.",
          hydrationError
        );
      }
    }
    if (contractData.action === "send_invite" && contractData.documentId) {
      try {
        const accessToken = await getAccessToken();
        await registerSignNowWebhook(accessToken, contractData.documentId);
        await moveSignNowDocument(
          contractData.documentId,
          SIGNNOW_FOLDERS.PENDING,
          accessToken
        );
        // ✅ ONLY call the V2 helper.
        // It now handles the Email, 2FA, and returns the Portal Link.
        const portalLink = await generateKioskSigningLink(
          accessToken,
          contractData.documentId,
          contractData
        );

        if (subscriptionId) {
          const supabaseUrl = Deno.env.get("SUPABASE_URL");
          const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
          if (supabaseUrl && supabaseKey) {
            const { createClient } = await import(
              "https://esm.sh/@supabase/supabase-js@2"
            );
            const supabase = createClient(supabaseUrl, supabaseKey);
            await supabase
              .from("contracts")
              .update({
                status: "pending",
                submitted_at: new Date().toISOString(),
                signature_method: "signnow_invite_portal",
                signnow_link: portalLink,
                signnow_document_id: contractData.documentId,
              })
              .eq("subscription_id", subscriptionId);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: "Invite sent and link generated",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (error: any) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    if (contractData.action === "download" && contractData.documentId) {
      try {
        const accessToken = await getAccessToken();
        const apiBase = Deno.env.get("SIGNNOW_API_BASE_URL");

        const response = await fetch(
          `${apiBase}/document/${contractData.documentId}/download?type=collapsed`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (!response.ok)
          throw new Error("Failed to fetch document from SignNow");
        const pdfBuffer = await response.arrayBuffer();

        return new Response(pdfBuffer, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="contract_draft.pdf"`,
          },
        });
      } catch (error: any) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    if (
      contractData.action === "email_copy" &&
      contractData.documentId &&
      contractData.emails
    ) {
      const accessToken = await getAccessToken();
      await emailSignedDocument(
        accessToken,
        contractData.documentId,
        contractData.emails
      );
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (contractData.debugConfig?.enabled) {
      if (!contractData.staffUserId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Debug mode requires staffUserId",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const hasAccess = await checkStaffAccess(contractData.staffUserId);
      if (!hasAccess) {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const sendMethod = contractData.sendMethod || "embed";
    const accessToken = await getAccessToken();

    // ============================================================
    // APPROVER FLOW
    // ============================================================
    if (contractData.useApproverFlow) {
      const { approverName, approverEmail } = contractData;
      if (!approverName || !approverEmail)
        throw new Error("Approver name and email required");

      // Fix: Safely extract location ID
      const locIdForApprover =
        typeof contractData.location === "string"
          ? contractData.location
          : contractData.location?.id;

      if (!locIdForApprover) {
        throw new Error(
          "Missing Location ID in request payload for Approver Flow"
        );
      }

      const locationKey = locIdForApprover.toUpperCase().replace(/-/g, "_");
      const tcSuffix = contractData.includeLegalPackage
        ? "WITH_TC"
        : "WITHOUT_TC";
      const approverTemplateId = Deno.env.get(
        `SIGNNOW_APPROVER_TEMPLATE_${locationKey}_${tcSuffix}`
      );

      if (!approverTemplateId)
        throw new Error(`Template not configured for ${locationKey}`);

      const documentId = await createDocumentFromTemplate(
        accessToken,
        contractData,
        approverTemplateId
      );

      await registerSignNowWebhook(accessToken, documentId);
      await moveSignNowDocument(
        documentId,
        SIGNNOW_FOLDERS.PENDING,
        accessToken
      );
      const documentData = await getDocumentData(accessToken, documentId);

      await prefillTextFields(
        accessToken,
        documentId,
        contractData,
        documentData
      );
      await prefillCheckboxFields(
        accessToken,
        documentId,
        contractData,
        documentData
      );

      const brandId = getBrandIdForLocation(locIdForApprover);
      if (brandId) {
        try {
          await assignBrandToDocument(
            accessToken,
            documentId,
            brandId,
            contractData
          );
        } catch (e) {}
      }

      const ccEmail = Deno.env.get("SIGNNOW_CC_EMAIL");
      await assignRoutingDetailsForApprover(
        accessToken,
        documentId,
        approverEmail,
        approverName.split(" ")[0],
        approverName.split(" ").slice(1).join(" "),
        contractData.subscriberInfo.email,
        contractData.subscriberInfo.firstName,
        contractData.subscriberInfo.lastName,
        ccEmail || undefined
      );

      const frontendUrl = contractData.frontendUrl || "";
      const embedUrl = await getEmbedView(
        accessToken,
        documentId,
        approverEmail,
        approverName,
        approverEmail,
        `${frontendUrl}/contract-success`
      );

      if (subscriptionId) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (supabaseUrl && supabaseKey) {
          const { createClient } = await import(
            "https://esm.sh/@supabase/supabase-js@2"
          );
          const supabase = createClient(supabaseUrl, supabaseKey);
          await supabase
            .from("contracts")
            .update({
              signnow_document_id: documentId,
              signature_method: "approver_flow_embed",
            })
            .eq("subscription_id", subscriptionId);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          documentId,
          embedUrl,
          flowType: "approver_embed",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ============================================================
    // DIRECT SIGNER FLOW
    // ============================================================
    // Fix: Safely extract location ID
    const locId =
      typeof contractData.location === "string"
        ? contractData.location
        : contractData.location?.id;

    if (!locId) {
      throw new Error("Missing Location ID in request payload");
    }

    const templateId = getTemplateIdForLocation(locId);
    if (!templateId) throw new Error(`No template for ${locId}`);

    const smartFieldsStructure = await getTemplateSmartFields(
      accessToken,
      templateId
    );
    const smartFieldObjectId =
      smartFieldsStructure?.integration_objects?.[0]?.api_integration_id;

    const documentId = await createDocumentFromTemplate(
      accessToken,
      contractData
    );

    if (smartFieldObjectId) {
      await prefillSmartFields(
        accessToken,
        documentId,
        smartFieldObjectId,
        contractData
      );
    } else {
      const documentData = await getDocumentData(accessToken, documentId);
      const availableFields = await getDocumentFields(documentData);
      await prefillTextFields(
        accessToken,
        documentId,
        contractData,
        availableFields
      );
      await prefillCheckboxFields(
        accessToken,
        documentId,
        contractData,
        documentData
      );

      if (!contractData.includeLegalPackage) {
        const brandId = getBrandIdForLocation(locId);
        if (brandId) {
          try {
            await assignBrandToDocument(
              accessToken,
              documentId,
              brandId,
              contractData
            );
          } catch (e) {}
        }
        if (sendMethod === "embed") {
          await assignRoutingDetails(
            accessToken,
            documentId,
            contractData.subscriberInfo.email,
            contractData.approverEmail ?? "",
            contractData.approverName ?? ""
          );
        }
      }
    }

    let finalDocumentId = documentId;
    let sepaDocumentId: string | null = null;
    let ccAuthDocumentId: string | null = null;
    let legalDocumentId: string | null = null;

    if (contractData.addSepaMandate)
      sepaDocumentId = await processSepaMandate(accessToken, contractData);
    if (contractData.addCcAuthorization)
      ccAuthDocumentId = await processCcAuthorization(
        accessToken,
        contractData
      );

    if (contractData.includeLegalPackage) {
      const cType =
        contractData.planInfo?.contractType ||
        contractData.contractType ||
        "individual";
      const legalTemplateId = getLegalTemplateId(locId, cType);
      if (legalTemplateId)
        legalDocumentId = await createDocumentFromTemplate(
          accessToken,
          contractData,
          legalTemplateId
        );
    }

    if (sepaDocumentId || ccAuthDocumentId || legalDocumentId) {
      const documentsToMerge = [documentId];
      if (sepaDocumentId) documentsToMerge.push(sepaDocumentId);
      if (ccAuthDocumentId) documentsToMerge.push(ccAuthDocumentId);
      if (legalDocumentId) documentsToMerge.push(legalDocumentId);

      finalDocumentId = await mergeDocuments(
        accessToken,
        documentsToMerge,
        contractData
      );
      await mergeSigners(accessToken, finalDocumentId);

      const brandId = getBrandIdForLocation(locId);
      if (brandId) {
        try {
          await assignBrandToDocument(
            accessToken,
            finalDocumentId,
            brandId,
            contractData
          );
        } catch (e) {}
      }

      if (sendMethod === "embed") {
        await assignRoutingDetails(
          accessToken,
          finalDocumentId,
          contractData.subscriberInfo.email,
          contractData.approverEmail ?? "",
          contractData.approverName ?? ""
        );
      }
    }
    await registerSignNowWebhook(accessToken, finalDocumentId);
    await moveSignNowDocument(
      finalDocumentId,
      SIGNNOW_FOLDERS.PENDING,
      accessToken
    );

    // ============================================================
    // SEND METHOD BRANCHING
    // ============================================================
    if (sendMethod === "kiosk") {
      const kioskLink = await generateKioskSigningLink(
        accessToken,
        finalDocumentId,
        contractData
      );
      if (subscriptionId) {
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL");
          const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
          if (supabaseUrl && supabaseKey) {
            const { createClient } = await import(
              "https://esm.sh/@supabase/supabase-js@2"
            );
            const supabase = createClient(supabaseUrl, supabaseKey);
            await supabase
              .from("contracts")
              .update({
                signnow_document_id: finalDocumentId,
                signnow_link: kioskLink,
                signature_method: "kiosk_embedded",
              })
              .eq("subscription_id", subscriptionId);
          }
        } catch (e) {}
      }
      return new Response(
        JSON.stringify({
          success: true,
          documentId: finalDocumentId,
          embedUrl: kioskLink,
          flowType: "kiosk",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (sendMethod === "email" || sendMethod === "sms") {
      const previewUrl = await getSenderPreviewUrl(
        accessToken,
        finalDocumentId,
        contractData.frontendUrl
      );
      return new Response(
        JSON.stringify({
          success: true,
          documentId: finalDocumentId,
          embedUrl: previewUrl,
          flowType: "sender_review",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      logger(
        LOG_LEVEL.INFO,
        `Starting Full Customer Flow (Email + Portal Link) for Sub: ${subscriptionId}`
      );
      // --- 2. GENERATE THE PORTAL LINK ---
      // This ensures the "Sign Document Now" button in the portal works.
      const signingLink = await generateKioskSigningLink(
        accessToken,
        finalDocumentId,
        contractData
      );

      logger(
        LOG_LEVEL.INFO,
        `Signing Link Generated for Portal: ${signingLink}`
      );

      // --- 3. SAVE TO DATABASE ---
      if (subscriptionId) {
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL");
          const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

          if (supabaseUrl && supabaseKey) {
            const { createClient } = await import(
              "https://esm.sh/@supabase/supabase-js@2"
            );
            const supabase = createClient(supabaseUrl, supabaseKey);

            const { data: dbData, error: dbError } = await supabase
              .from("contracts")
              .update({
                signnow_document_id: finalDocumentId,
                signnow_link: signingLink,
                status: "pending", // Mark as pending since email went out
                submitted_at: new Date().toISOString(),
                signature_method: "signnow_portal_direct",
              })
              .eq("subscription_id", subscriptionId)
              .select();

            if (dbError)
              logger(LOG_LEVEL.ERROR, `Supabase DB Update Error:`, dbError);
            else
              logger(
                LOG_LEVEL.INFO,
                `✅ Successfully updated DB with portal link.`
              );
          }
        } catch (e) {
          logger(LOG_LEVEL.ERROR, `DB Exception:`, e);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          documentId: finalDocumentId,
          embedUrl: signingLink,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error: any) {
    console.error("Error in signnow-contract function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
