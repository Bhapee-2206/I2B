// ==============================================================================
// I2B - Supabase Edge Function: Meta WhatsApp Cloud API Receipt Delivery (Mode B)
// Runs server-side with zero credentials exposed to browser client
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppReceiptPayload {
  recipientPhone: string;
  studentName: string;
  studentId: string;
  receiptNumber: string;
  paymentNumber: string;
  paymentDate: string;
  amount: number;
  remainingBalance: number;
  paymentMethod: string;
  pdfUrl?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verify authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Read Meta WhatsApp Cloud API secrets from Deno environment
    const metaAccessToken = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN");
    const metaPhoneNumberId = Deno.env.get("META_PHONE_NUMBER_ID");
    const metaTemplateName = Deno.env.get("META_RECEIPT_TEMPLATE_NAME") || "fee_payment_receipt";

    if (!metaAccessToken || !metaPhoneNumberId) {
      return new Response(
        JSON.stringify({
          error: "Meta WhatsApp Cloud API credentials not configured in Supabase secrets.",
          hint: "Set META_WHATSAPP_ACCESS_TOKEN and META_PHONE_NUMBER_ID in Supabase Dashboard > Settings > Edge Functions Secrets.",
          mode: "mode_b_unconfigured"
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: WhatsAppReceiptPayload = await req.json();

    if (!payload.recipientPhone || !payload.amount || !payload.receiptNumber) {
      return new Response(
        JSON.stringify({ error: "Invalid payload: recipientPhone, amount, and receiptNumber are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean phone number (e.g. 919876543210)
    const cleanPhone = payload.recipientPhone.replace(/\D/g, "");

    // 3. Dispatch to official Meta Graph API v18.0 endpoint
    const metaApiUrl = `https://graph.facebook.com/v18.0/${metaPhoneNumberId}/messages`;

    const metaRequestBody = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "template",
      template: {
        name: metaTemplateName,
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: payload.studentName },
              { type: "text", text: payload.studentId },
              { type: "text", text: payload.receiptNumber },
              { type: "text", text: `Rs. ${payload.amount.toLocaleString("en-IN")}` },
              { type: "text", text: payload.paymentDate },
              { type: "text", text: `Rs. ${payload.remainingBalance.toLocaleString("en-IN")}` }
            ]
          },
          ...(payload.pdfUrl ? [
            {
              type: "header",
              parameters: [
                {
                  type: "document",
                  document: {
                    link: payload.pdfUrl,
                    filename: `${payload.receiptNumber}_Receipt.pdf`
                  }
                }
              ]
            }
          ] : [])
        ]
      }
    };

    const metaResponse = await fetch(metaApiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${metaAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metaRequestBody),
    });

    const metaData = await metaResponse.json();

    if (!metaResponse.ok) {
      console.error("[Meta Cloud API Error]", metaData);
      return new Response(
        JSON.stringify({
          error: "Failed to dispatch WhatsApp message via Meta Cloud API",
          details: metaData
        }),
        { status: metaResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: metaData.messages?.[0]?.id,
        recipient: cleanPhone,
        status: "dispatched"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[Edge Function Exception]", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

