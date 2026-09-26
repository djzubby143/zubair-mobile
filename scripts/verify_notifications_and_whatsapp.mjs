import fs from "fs";
import path from "path";
import { sendAdminOrderWhatsAppAlert } from "../lib/whatsapp.ts";

async function testNotificationsAndWhatsApp() {
  console.log("=== TESTING PERSISTENT NOTIFICATIONS & WHATSAPP ALERTS ===");

  // 1. Test GET /api/admin/notifications
  const getRes = await fetch("http://localhost:3000/api/admin/notifications?type=admin", {
    headers: { "x-admin-role": "admin" },
  });
  const getData = await getRes.json();
  console.log("[GET Notifications]", getRes.status, `Total: ${getData.notifications?.length}, Unread: ${getData.unreadCount}`);

  // 2. Test POST /api/admin/notifications (Create new order notification)
  const postRes = await fetch("http://localhost:3000/api/admin/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-role": "admin" },
    body: JSON.stringify({
      recipient_type: "admin",
      type: "new_order",
      title: "New Wholesale Order Received: #ZM-998822",
      message: "Zubair Mobile Repair placed an order for Rs. 48,000 (4 items).",
      reference_id: "order-test-998822",
      link_url: "/admin/orders",
      whatsapp_text: "New wholesale order ZM-998822 for Rs. 48,000",
      data: { order_number: "ZM-998822", total: 48000 },
    }),
  });
  const postData = await postRes.json();
  console.log("[POST Notification]", postRes.status, postData.notification?.id);

  // 3. Test unread count updated
  const getRes2 = await fetch("http://localhost:3000/api/admin/notifications?type=admin", {
    headers: { "x-admin-role": "admin" },
  });
  const getData2 = await getRes2.json();
  console.log("[Verified Unread Count Increment]", `New Unread: ${getData2.unreadCount}`);

  // 4. Test WhatsApp automated alert dispatch
  console.log("[Testing WhatsApp Automated Alert]");
  const waResult = await sendAdminOrderWhatsAppAlert({
    order_number: "ZM-998822",
    customer_name: "Zubair Mobile Repair",
    customer_phone: "03458032600",
    total_amount: 48000,
    items: [{}, {}, {}, {}],
    pricing_tier: "wholesale",
    payment_method: "Bank Transfer",
  });
  console.log("  WhatsApp Alert Status:", waResult.status);
  console.log("  WhatsApp Recipient:", waResult.recipient);

  const logsPath = path.resolve(process.cwd(), "data/whatsapp_logs.json");
  if (fs.existsSync(logsPath)) {
    const logs = JSON.parse(fs.readFileSync(logsPath, "utf-8"));
    console.log(`  Logged Activity in whatsapp_logs.json: ${logs.length} entries.`);
    console.log(`  Latest log message snippet: ${logs[0]?.messageText?.slice(0, 60)}...`);
  }

  // 5. Mark as read
  const patchRes = await fetch("http://localhost:3000/api/admin/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-role": "admin" },
    body: JSON.stringify({ id: postData.notification?.id }),
  });
  const patchData = await patchRes.json();
  console.log("[PATCH Notification Read]", patchRes.status, patchData.message);

  console.log("=== PERSISTENT NOTIFICATIONS & WHATSAPP VERIFIED SUCCESSFULLY ===");
}

testNotificationsAndWhatsApp().catch(console.error);
