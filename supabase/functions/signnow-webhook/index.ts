import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

// --- We need to re-define the email function here, or import it ---
// For simplicity in Edge Functions, we'll re-define it.
// Make sure this is the same version from your `signnow-contract` file.
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
  const senderEmail = Deno.env.get("SES_FROM_EMAIL"); // Must be verified in SES

  if (!awsAccessKey || !awsSecretKey || !senderEmail) {
    throw new Error("Missing AWS SES configuration for contract emails");
  }
  const financeEmail = Deno.env.get("SIGNNOW_FINANCE_CC_EMAIL");

  // Create a new unique set of recipients to avoid duplicates
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

  // Wait a moment for PDF generation on SignNow side
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

  // SAFE CONVERSION: Process in chunks to avoid Stack Overflow
  const u8 = new Uint8Array(pdfArrayBuffer);
  const CHUNK_SIZE = 0x8000; // 32768
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

  // 3. SEND VIA AWS SES (Raw MIME for Attachment)
  for (const email of targetEmails) {
    if (!email) continue;

    // Construct Raw MIME Email
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

    // AWS V4 Signing for SES SendRawEmail
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
      Content: { Raw: { Data: btoa(rawEmailData) } }, // Data must be base64 encoded for SES API V2
    });

    // Sign the request
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

    // Send
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
// ============================================================
// AWS SES HELPERS (Required for emailSignedDocument)
// ============================================================
const encoder = new TextEncoder();

async function sha256(message: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(message));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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
      return false;
    }

    logger(
      LOG_LEVEL.INFO,
      `✅ Document successfully moved to folder ${folderId}.`
    );
    return true;
  } catch (error: any) {
    logger(LOG_LEVEL.ERROR, `❌ Exception moving document: ${error.message}`);
    return false;
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
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("🔔 Webhook Received:", JSON.stringify(payload, null, 2));

    const eventType = payload.meta?.event; // This is "document.complete" in your log
    const documentId =
      payload.content?.document_id ||
      payload.document_id ||
      payload.meta?.entity_id;

    // In V2 'document.complete', the status is implicit in the event name
    const isCompleted =
      eventType === "document.complete" ||
      (eventType === "document.update" &&
        payload.result?.status === "completed");

    // Catch Expiration events
    const isExpired =
      eventType === "document.expire" ||
      (eventType === "document.update" && payload.result?.status === "expired");

    if (!documentId) {
      logger(LOG_LEVEL.ERROR, "❌ No Document ID found in webhook payload");
      return new Response("No ID", { status: 400 });
    }

    // =======================================================================
    // SCENARIO 1: DOCUMENT EXPIRED
    // =======================================================================
    if (isExpired) {
      console.log(
        `⚠️ Document ${documentId} EXPIRED. Moving to Expired folder...`
      );
      try {
        const accessToken = await getAccessToken();
        await moveSignNowDocument(
          documentId,
          SIGNNOW_FOLDERS.EXPIRED,
          accessToken
        );
      } catch (err) {
        console.error("Failed to move expired document:", err);
      }
      return new Response(
        JSON.stringify({ received: true, action: "moved_to_expired" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // =======================================================================
    // SCENARIO 2: DOCUMENT COMPLETED / SIGNED
    // =======================================================================
    if (isCompleted) {
      console.log(
        `✅ Document ${documentId} was signed. Processing Activation...`
      );

      // Fetch the token early so we can use it for moving AND emailing
      const accessToken = await getAccessToken();

      // --- NEW: MOVE TO SIGNED FOLDER IMMEDIATELY ---
      await moveSignNowDocument(
        documentId,
        SIGNNOW_FOLDERS.SIGNED,
        accessToken
      );

      // 1. Initialize Supabase with the SERVICE ROLE KEY (to bypass RLS in the background)
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // 2. Look up the contract using the document ID
      const { data: contractData, error: contractError } = await supabase
        .from("contracts")
        .select(
          `
          id,
          status,
          subscription_id,
          subscriptions (
            created_by_email,
            subscribers (email)
          )
        `
        )
        .eq("signnow_document_id", documentId)
        .single();

      if (contractError || !contractData) {
        throw new Error(
          `Webhook Error: Could not find contract for Document ID: ${documentId}`
        );
      }

      // =======================================================================
      // 3. IDEMPOTENCY CHECK (Crucial for avoiding duplicate activations)
      // =======================================================================
      if (contractData.status === "signed") {
        console.log(
          `Contract ${contractData.id} is already marked as signed. Ignoring duplicate webhook.`
        );
        return new Response(
          JSON.stringify({ received: true, ignored: "duplicate" }),
          { status: 200, headers: corsHeaders }
        );
      }

      // =======================================================================
      // 4. THE STATE MACHINE ACTIVATION
      // =======================================================================
      const subId = contractData.subscription_id;

      // A. Mark Contract as signed
      await supabase
        .from("contracts")
        .update({ status: "signed", signed_at: new Date().toISOString() })
        .eq("id", contractData.id);

      // B. Mark Subscription as active
      await supabase
        .from("subscriptions")
        .update({ status: "active" })
        .eq("id", subId);

      // C. Audit Log the exact transition
      await supabase.from("subscription_events").insert({
        subscription_id: subId,
        from_status: "pending_signature",
        to_status: "active",
        reason: "Customer successfully signed SignNow contract",
        created_by: "signnow_webhook",
      });

      console.log(`✅ Subscription ${subId} is now ACTIVE!`);

      // =======================================================================
      // 5. SEND THE PDF EMAILS
      // =======================================================================
      const customerEmail = contractData.subscriptions?.subscribers?.email;
      const staffEmail = contractData.subscriptions?.created_by_email;

      if (customerEmail && staffEmail) {
        const recipients = [customerEmail, staffEmail];
        // token already fetched above
        await emailSignedDocument(accessToken, documentId, recipients);
      } else {
        console.warn(
          "Could not extract emails for distribution, skipping SES."
        );
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Webhook Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
