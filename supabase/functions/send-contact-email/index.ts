import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 3; // Max 3 submissions per minute per IP

// In-memory rate limit store (resets on function cold start)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up expired entries periodically
function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [ip, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(ip);
    }
  }
}

// Check and update rate limit for an IP
function checkRateLimit(ip: string): { allowed: boolean; remainingRequests: number; resetInSeconds: number } {
  cleanupRateLimitStore();
  
  const now = Date.now();
  const record = rateLimitStore.get(ip);
  
  if (!record || now > record.resetTime) {
    // New window - allow request and start counting
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remainingRequests: MAX_REQUESTS_PER_WINDOW - 1, resetInSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000) };
  }
  
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    // Rate limit exceeded
    const resetInSeconds = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, remainingRequests: 0, resetInSeconds };
  }
  
  // Increment count and allow
  record.count++;
  const resetInSeconds = Math.ceil((record.resetTime - now) / 1000);
  return { allowed: true, remainingRequests: MAX_REQUESTS_PER_WINDOW - record.count, resetInSeconds };
}

// Get client IP from request headers
function getClientIP(req: Request): string {
  // Check common proxy headers
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Take the first IP in the chain (original client)
    return forwardedFor.split(",")[0].trim();
  }
  
  const realIP = req.headers.get("x-real-ip");
  if (realIP) {
    return realIP.trim();
  }
  
  const cfConnectingIP = req.headers.get("cf-connecting-ip");
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }
  
  // Fallback to a default if no IP found
  return "unknown";
}

interface ContactFormData {
  fullName: string;
  email: string;
  contactNumber?: string;
  company?: string;
  projectDescription: string;
  source?: string;
}

// HTML entity encoding to prevent XSS
const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

// Validate and sanitize input
const validateInput = (
  data: ContactFormData,
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.fullName || data.fullName.trim().length === 0) {
    errors.push("Full name is required");
  } else if (data.fullName.length > 100) {
    errors.push("Full name must be less than 100 characters");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || !emailRegex.test(data.email)) {
    errors.push("Valid email is required");
  } else if (data.email.length > 255) {
    errors.push("Email must be less than 255 characters");
  }

  if (data.contactNumber && !/^\d+$/.test(data.contactNumber.replace(/\s+/g, ""))) {
    errors.push("Phone number must contain only digits");
  }

  if (!data.projectDescription || data.projectDescription.trim().length === 0) {
    errors.push("Project description is required");
  } else if (data.projectDescription.length > 1000) {
    errors.push("Project description must be less than 1000 characters");
  }

  return { valid: errors.length === 0, errors };
};

// AWS Signature V4 signing
const encoder = new TextEncoder();

async function hmacSha256(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
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
  serviceName: string,
): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(encoder.encode("AWS4" + key), dateStamp);
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

async function sendEmailViaSES(
  toEmail: string,
  fromEmail: string,
  subject: string,
  htmlBody: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
  const region = Deno.env.get("AWS_REGION") || "us-east-2";

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("AWS credentials not configured");
  }

  const service = "ses";
  const host = `email.${region}.amazonaws.com`;
  const endpoint = `https://${host}/v2/email/outbound-emails`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 15) +
    "Z";
  const dateStamp = amzDate.slice(0, 8);

  const requestBody = JSON.stringify({
    Content: {
      Simple: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: htmlBody,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject,
        },
      },
    },
    Destination: {
      ToAddresses: [toEmail],
    },
    FromEmailAddress: fromEmail,
  });

  const payloadHash = await sha256(requestBody);

  const canonicalHeaders =
    `content-type:application/json\n` +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n`;

  const signedHeaders = "content-type;host;x-amz-date";

  const canonicalRequest =
    `POST\n` +
    `/v2/email/outbound-emails\n` +
    `\n` +
    canonicalHeaders +
    `\n` +
    signedHeaders +
    `\n` +
    payloadHash;

  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalRequestHash = await sha256(canonicalRequest);

  const stringToSign =
    `${algorithm}\n` +
    `${amzDate}\n` +
    `${credentialScope}\n` +
    canonicalRequestHash;

  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signatureBuffer = await hmacSha256(signingKey, stringToSign);
  const signature = toHex(signatureBuffer);

  const authorizationHeader =
    `${algorithm} ` +
    `Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, ` +
    `Signature=${signature}`;

  console.log(`Sending email via AWS SES to ${toEmail} from ${fromEmail}`);
  console.log(`Region: ${region}, Host: ${host}`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Amz-Date": amzDate,
      "Authorization": authorizationHeader,
    },
    body: requestBody,
  });

  const responseText = await response.text();
  console.log(`SES Response Status: ${response.status}`);
  console.log(`SES Response: ${responseText}`);

  if (!response.ok) {
    return {
      success: false,
      error: `SES API error: ${response.status} - ${responseText}`,
    };
  }

  try {
    const result = JSON.parse(responseText);
    return { success: true, messageId: result.MessageId };
  } catch {
    return { success: true, messageId: "sent" };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting check
    const clientIP = getClientIP(req);
    const rateLimit = checkRateLimit(clientIP);
    
    console.log(`Rate limit check for IP ${clientIP}: allowed=${rateLimit.allowed}, remaining=${rateLimit.remainingRequests}`);
    
    if (!rateLimit.allowed) {
      console.warn(`Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ 
          error: "Too many requests. Please try again later.",
          retryAfter: rateLimit.resetInSeconds 
        }),
        {
          status: 429,
          headers: { 
            "Content-Type": "application/json",
            "Retry-After": rateLimit.resetInSeconds.toString(),
            ...corsHeaders 
          },
        },
      );
    }

    const formData: ContactFormData = await req.json();

    const validation = validateInput(formData);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.errors.join(", ") }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const fromEmail = Deno.env.get("SES_FROM_EMAIL") || "sales@appther.com";

    // IMPORTANT: In SES sandbox, BOTH sender and recipient must be verified.
    // Default recipient falls back to the verified sender to avoid 400 errors.
    const toEmail = Deno.env.get("SES_TO_EMAIL") || fromEmail;

    // Sanitize all inputs
    const sanitizedName = escapeHtml(formData.fullName.trim());
    const sanitizedEmail = escapeHtml(formData.email.trim());
    const sanitizedPhone = formData.contactNumber
      ? escapeHtml(formData.contactNumber.trim())
      : null;
    const sanitizedCompany = formData.company
      ? escapeHtml(formData.company.trim())
      : null;
    const sanitizedDescription = escapeHtml(formData.projectDescription.trim());
    const sanitizedSource = formData.source ? escapeHtml(formData.source.trim()) : null;

    const emailSubject = "New Contact Form Submission";
    const emailBody = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${sanitizedName}</p>
      <p><strong>Email:</strong> ${sanitizedEmail}</p>
      ${sanitizedPhone ? `<p><strong>Contact Number:</strong> ${sanitizedPhone}</p>` : ""}
      ${sanitizedCompany ? `<p><strong>Company:</strong> ${sanitizedCompany}</p>` : ""}
      <p><strong>Project Description:</strong></p>
      <p>${sanitizedDescription}</p>
      ${sanitizedSource ? `<p><strong>Source:</strong> ${sanitizedSource}</p>` : ""}
      <hr>
      <p><em>This email was sent from the Appther contact form via Amazon SES.</em></p>
    `;

    const result = await sendEmailViaSES(toEmail, fromEmail, emailSubject, emailBody);

    if (!result.success) {
      console.error("SES error:", result.error);
      throw new Error(result.error);
    }

    console.log("Notification email sent successfully via AWS SES, MessageId:", result.messageId);

    // Send auto-reply confirmation email to the user
    const autoReplySubject = "Thank You for Contacting Appther!";
    const autoReplyBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Appther</h1>
                    <p style="margin: 10px 0 0; color: #bfdbfe; font-size: 14px;">Digital Solutions Partner</p>
                  </td>
                </tr>
                
                <!-- Body -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 20px; color: #1e3a8a; font-size: 22px;">Hello ${sanitizedName},</h2>
                    
                    <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                      Thank you for reaching out to us! We have received your inquiry and truly appreciate your interest in Appther.
                    </p>
                    
                    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                      <p style="margin: 0; color: #1e40af; font-size: 16px; font-weight: 500;">
                        Our team will review your requirements and connect with you within the next couple of hours.
                      </p>
                    </div>
                    
                    <p style="margin: 0 0 15px; color: #374151; font-size: 16px; line-height: 1.6;">
                      <strong>Here is a summary of what you shared with us:</strong>
                    </p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; width: 120px;">Name:</td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">${sanitizedName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Email:</td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">${sanitizedEmail}</td>
                      </tr>
                      ${sanitizedPhone ? `
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Phone:</td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">${sanitizedPhone}</td>
                      </tr>
                      ` : ""}
                      ${sanitizedCompany ? `
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Company:</td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">${sanitizedCompany}</td>
                      </tr>
                      ` : ""}
                    </table>
                    
                    <p style="margin: 0 0 25px; color: #374151; font-size: 16px; line-height: 1.6;">
                      If you have any urgent questions in the meantime, feel free to reply to this email or reach us directly at <a href="mailto:sales@appther.com" style="color: #3b82f6; text-decoration: none;">sales@appther.com</a>.
                    </p>
                    
                    <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">
                      We look forward to working with you!
                    </p>
                    
                    <p style="margin: 25px 0 0; color: #374151; font-size: 16px;">
                      Warm regards,<br>
                      <strong style="color: #1e3a8a;">The Appther Team</strong>
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 25px 40px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px; text-align: center;">
                      Appther Technologies | Building Digital Excellence
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                      This is an automated confirmation email. Please do not reply directly to this message.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Try to send auto-reply (don't fail the whole request if this fails in sandbox mode)
    try {
      const autoReplyResult = await sendEmailViaSES(
        formData.email.trim(), // Send to user's actual email
        fromEmail,
        autoReplySubject,
        autoReplyBody
      );

      if (autoReplyResult.success) {
        console.log("Auto-reply email sent successfully, MessageId:", autoReplyResult.messageId);
      } else {
        // Log warning but don't fail - this is expected in SES sandbox mode for unverified emails
        console.warn("Auto-reply email failed (likely SES sandbox restriction):", autoReplyResult.error);
      }
    } catch (autoReplyError) {
      console.warn("Auto-reply email error (continuing anyway):", autoReplyError);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
};

serve(handler);