import fs from "fs";
import path from "path";

const LOGS_FILE = path.join(process.cwd(), "data", "whatsapp_logs.json");

export interface WhatsAppSendResult {
  success: boolean;
  status: "sent" | "simulated_no_credentials" | "failed";
  recipient: string;
  messageId?: string;
  error?: string;
  timestamp: string;
}

function logWhatsAppActivity(entry: WhatsAppSendResult & { messageText: string }) {
  try {
    let logs: any[] = [];
    if (fs.existsSync(LOGS_FILE)) {
      try {
        logs = JSON.parse(fs.readFileSync(LOGS_FILE, "utf8"));
        if (!Array.isArray(logs)) logs = [];
      } catch {}
    }
    logs.unshift(entry);
    // Keep last 100 logs
    const trimmed = logs.slice(0, 100);
    fs.writeFileSync(LOGS_FILE, JSON.stringify(trimmed, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write WhatsApp log entry:", err);
  }
}

/**
 * Clean phone number to Pakistani international standard: e.g. 923458032600
 */
export function normalizeWhatsAppNumber(phone: string): string {
  const clean = phone.replace(/[^0-9]/g, "");
  if (clean.startsWith("03")) {
    return "92" + clean.slice(1);
  }
  if (!clean.startsWith("92")) {
    return "92" + clean;
  }
  return clean;
}

/**
 * Dispatch message via Meta WhatsApp Business Cloud API (v18.0+)
 * Fallback gracefully if credentials are not configured in environment.
 */
export async function sendMetaWhatsAppMessage(
  recipientPhone: string,
  messageText: string
): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_CLOUD_API_TOKEN || process.env.META_WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const recipient = normalizeWhatsAppNumber(recipientPhone);
  const timestamp = new Date().toISOString();

  // If no Meta credentials configured, record as simulated and log safely
  if (!token || !phoneNumberId) {
    const result: WhatsAppSendResult = {
      success: true,
      status: "simulated_no_credentials",
      recipient,
      messageId: `sim-${Date.now()}`,
      timestamp,
      error: "WhatsApp Cloud API credentials not configured in env (WHATSAPP_CLOUD_API_TOKEN/WHATSAPP_PHONE_NUMBER_ID). Logged locally.",
    };
    logWhatsAppActivity({ ...result, messageText });
    return result;
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "text",
        text: { preview_url: false, body: messageText },
      }),
    });

    const resJson = await response.json();

    if (!response.ok) {
      const errMsg = resJson?.error?.message || `Meta API Error (${response.status})`;
      const result: WhatsAppSendResult = {
        success: false,
        status: "failed",
        recipient,
        error: errMsg,
        timestamp,
      };
      logWhatsAppActivity({ ...result, messageText });
      return result;
    }

    const messageId = resJson?.messages?.[0]?.id || `wa-${Date.now()}`;
    const result: WhatsAppSendResult = {
      success: true,
      status: "sent",
      recipient,
      messageId,
      timestamp,
    };
    logWhatsAppActivity({ ...result, messageText });
    return result;
  } catch (err: any) {
    const result: WhatsAppSendResult = {
      success: false,
      status: "failed",
      recipient,
      error: err.message || "Network error sending WhatsApp message",
      timestamp,
    };
    logWhatsAppActivity({ ...result, messageText });
    return result;
  }
}

/**
 * Server-Side Automated WhatsApp Alert for New Orders
 */
export async function sendAdminOrderWhatsAppAlert(order: {
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  total_amount: number;
  items?: any[];
  pricing_tier?: string;
  payment_method?: string;
}): Promise<WhatsAppSendResult> {
  const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER || "03458032600";
  const itemCount = order.items?.length || 1;
  const tier = (order.pricing_tier || "retail").toUpperCase();

  const text = 
    `*🔔 NEW ORDER ALERT - ZUBAIR MOBILE*\n` +
    `--------------------------------\n` +
    `*Order #:* ${order.order_number}\n` +
    `*Customer:* ${order.customer_name}\n` +
    `*Phone:* ${order.customer_phone || "N/A"}\n` +
    `*Tier:* ${tier}\n` +
    `*Items:* ${itemCount} items\n` +
    `*Total Bill:* Rs. ${order.total_amount.toLocaleString()}\n` +
    `*Payment:* ${(order.payment_method || "COD").toUpperCase()}\n` +
    `*Time:* ${new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}\n` +
    `--------------------------------\n` +
    `View in Admin Dashboard: /admin/orders`;

  return await sendMetaWhatsAppMessage(adminPhone, text);
}
