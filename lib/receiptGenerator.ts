import { Order } from "@/lib/orders";

/**
 * Generate and download high-resolution Thermal Receipt JPEG image
 * Width: 576px (standard 80mm thermal POS receipt width at 203 DPI)
 */
export async function generateReceiptJpeg(order: Order, logoSrc = "/logo.jpg"): Promise<void> {
  if (typeof window === "undefined") return;

  // Pre-load logo image
  const logoImg = new Image();
  logoImg.crossOrigin = "anonymous";
  await new Promise<void>((resolve) => {
    logoImg.onload = () => resolve();
    logoImg.onerror = () => resolve(); // Proceed even if logo fails to load
    logoImg.src = logoSrc;
  });

  // Calculate dynamic canvas height based on item count
  const itemHeightEstimate = order.items.length * 45;
  const canvasWidth = 576;
  const canvasHeight = 780 + itemHeightEstimate;

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background - pure white for thermal clarity
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Styling helpers
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  let y = 20;

  // 1. Draw Official Logo if available
  if (logoImg.complete && logoImg.naturalWidth > 0) {
    const logoSize = 70;
    ctx.drawImage(logoImg, (canvasWidth - logoSize) / 2, y, logoSize, logoSize);
    y += logoSize + 12;
  }

  // 2. Shop Header
  ctx.font = "bold 24px 'Courier New', monospace";
  ctx.fillText("ZUBAIR MOBILE", canvasWidth / 2, y);
  y += 28;

  ctx.font = "bold 13px 'Courier New', monospace";
  ctx.fillText("REPAIR SERVICES & MOBILE SPARE PARTS", canvasWidth / 2, y);
  y += 18;

  ctx.font = "12px 'Courier New', monospace";
  ctx.fillText("Shop No. B16, Chand Plaza, Garjakhi Darwaza", canvasWidth / 2, y);
  y += 16;
  ctx.fillText("Gujranwala, Punjab, Pakistan", canvasWidth / 2, y);
  y += 18;

  ctx.font = "bold 15px 'Courier New', monospace";
  ctx.fillText("WhatsApp / Call: 0345-8032600", canvasWidth / 2, y);
  y += 24;

  // Dashed dividing line
  const drawDashedLine = (currY: number) => {
    ctx.font = "14px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText("------------------------------------------------", canvasWidth / 2, currY);
  };

  const drawDoubleLine = (currY: number) => {
    ctx.font = "14px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText("================================================", canvasWidth / 2, currY);
  };

  drawDashedLine(y);
  y += 18;

  // 3. Order & Customer Info (Left aligned)
  ctx.textAlign = "left";
  ctx.font = "bold 13px 'Courier New', monospace";
  const dateStr = new Date(order.created_at).toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  ctx.fillText(`ORDER NO: #${order.order_number}`, 24, y);
  ctx.textAlign = "right";
  ctx.fillText(`DATE: ${dateStr}`, canvasWidth - 24, y);
  y += 20;

  ctx.textAlign = "left";
  ctx.font = "13px 'Courier New', monospace";
  ctx.fillText(`CUSTOMER: ${order.customer_name}`, 24, y);
  y += 18;

  if (order.shop_name) {
    ctx.fillText(`SHOP:     ${order.shop_name}`, 24, y);
    y += 18;
  }

  ctx.fillText(`PHONE:    ${order.customer_phone}`, 24, y);
  y += 18;

  // Address (with multi-line wrap)
  const addressText = `ADDRESS:  ${order.customer_address}`;
  ctx.fillText(addressText.slice(0, 48), 24, y);
  y += 18;
  if (addressText.length > 48) {
    ctx.fillText(`          ${addressText.slice(48, 96)}`, 24, y);
    y += 18;
  }

  drawDoubleLine(y);
  y += 18;

  // 4. Table Header
  ctx.font = "bold 13px 'Courier New', monospace";
  ctx.textAlign = "left";
  ctx.fillText("QTY", 24, y);
  ctx.fillText("ITEM DESCRIPTION", 75, y);
  ctx.textAlign = "right";
  ctx.fillText("RATE", canvasWidth - 110, y);
  ctx.fillText("AMOUNT", canvasWidth - 24, y);
  y += 18;

  drawDashedLine(y);
  y += 16;

  // 5. Items Loop
  ctx.font = "13px 'Courier New', monospace";
  order.items.forEach((item) => {
    // Qty
    ctx.textAlign = "left";
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillText(`${item.quantity}x`, 24, y);

    // Item Title (truncate / wrap)
    ctx.font = "12px 'Courier New', monospace";
    const displayName = item.name.length > 26 ? item.name.slice(0, 24) + ".." : item.name;
    ctx.fillText(displayName.toUpperCase(), 75, y);

    // Rate
    ctx.textAlign = "right";
    ctx.fillText(`${item.price.toLocaleString()}`, canvasWidth - 110, y);

    // Amount
    const amount = item.price * item.quantity;
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillText(`Rs.${amount.toLocaleString()}`, canvasWidth - 24, y);
    y += 24;

    // SKU sub-line if available
    if (item.sku) {
      ctx.textAlign = "left";
      ctx.font = "10px 'Courier New', monospace";
      ctx.fillText(`    [SKU: ${item.sku}]`, 75, y - 6);
      y += 14;
    }
  });

  drawDoubleLine(y);
  y += 18;

  // 6. Totals
  ctx.textAlign = "left";
  ctx.font = "13px 'Courier New', monospace";
  ctx.fillText(`TOTAL ITEMS: ${order.total_items}`, 24, y);
  ctx.textAlign = "right";
  ctx.fillText(`SUBTOTAL: Rs.${order.total_amount.toLocaleString()}`, canvasWidth - 24, y);
  y += 20;

  ctx.textAlign = "left";
  ctx.fillText("DELIVERY / CARGO:", 24, y);
  ctx.textAlign = "right";
  ctx.fillText("PAY ON ARRIVAL", canvasWidth - 24, y);
  y += 22;

  drawDashedLine(y);
  y += 18;

  // Grand Total in Large Bold
  ctx.textAlign = "left";
  ctx.font = "bold 18px 'Courier New', monospace";
  ctx.fillText("GRAND TOTAL:", 24, y);
  ctx.textAlign = "right";
  ctx.font = "bold 20px 'Courier New', monospace";
  ctx.fillText(`Rs. ${order.total_amount.toLocaleString()}`, canvasWidth - 24, y);
  y += 30;

  drawDoubleLine(y);
  y += 20;

  // 7. Footer Notice
  ctx.textAlign = "center";
  ctx.font = "bold 13px 'Courier New', monospace";
  ctx.fillText("*** THANK YOU FOR YOUR BUSINESS! ***", canvasWidth / 2, y);
  y += 20;

  ctx.font = "11px 'Courier New', monospace";
  ctx.fillText("Tested Genuine Spare Parts Guaranteed", canvasWidth / 2, y);
  y += 16;
  ctx.fillText("No returns/exchange without original bill slip.", canvasWidth / 2, y);
  y += 16;
  ctx.fillText("Zubair Mobile | Gujranwala | 0345-8032600", canvasWidth / 2, y);
  y += 24;

  // Simulated POS Barcode line
  ctx.font = "18px monospace";
  ctx.fillText(`||| | ||||| |||| || |||||| | ||| |||||`, canvasWidth / 2, y);
  y += 20;
  ctx.font = "11px 'Courier New', monospace";
  ctx.fillText(`* ${order.order_number} *`, canvasWidth / 2, y);

  // 8. Convert to JPEG blob and download
  canvas.toBlob(
    (blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `zubair_bill_${order.order_number}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    },
    "image/jpeg",
    0.95
  );
}

/**
 * Print order directly to standard 80mm / 58mm Thermal POS Printer
 */
export function printThermalReceipt(order: Order, logoSrc = "/logo.jpg"): void {
  if (typeof window === "undefined") return;

  const dateStr = new Date(order.created_at).toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const printWindow = window.open("", "_blank", "width=420,height=600");
  if (!printWindow) {
    alert("Please allow popups to print the thermal receipt.");
    return;
  }

  const itemsHtml = order.items
    .map(
      (item) => `
    <tr>
      <td style="vertical-align: top; font-weight: bold; width: 15%;">${item.quantity}x</td>
      <td style="vertical-align: top; width: 50%;">
        ${item.name.toUpperCase()}
        ${item.sku ? `<br><small style="font-size: 9px; color: #555;">[SKU: ${item.sku}]</small>` : ""}
      </td>
      <td style="vertical-align: top; text-align: right; width: 15%;">${item.price.toLocaleString()}</td>
      <td style="vertical-align: top; text-align: right; font-weight: bold; width: 20%;">Rs.${(item.price * item.quantity).toLocaleString()}</td>
    </tr>
  `
    )
    .join("");

  const content = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt #${order.order_number}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          @media print {
            body {
              width: 76mm;
              margin: 0 auto;
              padding: 6px;
            }
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            line-height: 1.35;
            color: #000;
            background: #fff;
            width: 76mm;
            margin: 0 auto;
            padding: 8px;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .divider {
            border-top: 1px dashed #000;
            margin: 6px 0;
          }
          .double-divider {
            border-top: 2px solid #000;
            margin: 6px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10.5px;
          }
          td, th {
            padding: 3px 0;
          }
          .logo-img {
            max-width: 60px;
            height: auto;
            margin: 0 auto 4px auto;
            display: block;
          }
        </style>
      </head>
      <body>
        <div class="text-center">
          <img src="${logoSrc}" class="logo-img" alt="Logo" onerror="this.style.display='none'" />
          <div style="font-size: 18px; font-weight: bold; letter-spacing: 0.5px;">ZUBAIR MOBILE</div>
          <div style="font-size: 10px; font-weight: bold;">REPAIR SERVICES & SPARE PARTS</div>
          <div style="font-size: 9.5px; margin-top: 2px;">Shop No. B16, Chand Plaza, Garjakhi Darwaza, Gujranwala</div>
          <div style="font-size: 11px; font-weight: bold; margin-top: 2px;">WhatsApp: 0345-8032600</div>
        </div>

        <div class="divider"></div>

        <div>
          <div style="display: flex; justify-content: space-between;">
            <span class="font-bold">ORDER #${order.order_number}</span>
            <span>${dateStr}</span>
          </div>
          <div style="margin-top: 4px;"><strong>CUSTOMER:</strong> ${order.customer_name}</div>
          ${order.shop_name ? `<div><strong>SHOP:</strong> ${order.shop_name}</div>` : ""}
          <div><strong>PHONE:</strong> ${order.customer_phone}</div>
          <div><strong>ADDRESS:</strong> ${order.customer_address}</div>
        </div>

        <div class="double-divider"></div>

        <table>
          <thead>
            <tr style="border-bottom: 1px dashed #000; text-align: left;">
              <th>QTY</th>
              <th>ITEM</th>
              <th class="text-right">RATE</th>
              <th class="text-right">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="double-divider"></div>

        <div style="font-size: 11px;">
          <div style="display: flex; justify-content: space-between;">
            <span>TOTAL ITEMS:</span>
            <strong>${order.total_items}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 2px;">
            <span>SUBTOTAL:</span>
            <strong>Rs. ${order.total_amount.toLocaleString()}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 2px;">
            <span>CARGO / COURIER:</span>
            <span>PAY ON ARRIVAL</span>
          </div>
        </div>

        <div class="divider"></div>

        <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold;">
          <span>GRAND TOTAL:</span>
          <span>Rs. ${order.total_amount.toLocaleString()}</span>
        </div>

        <div class="double-divider"></div>

        <div class="text-center" style="font-size: 9.5px; margin-top: 6px;">
          <div class="font-bold" style="font-size: 11px;">*** SHUKRIYA / THANK YOU ***</div>
          <div style="margin-top: 2px;">Genuine Mobile Spare Parts Guaranteed</div>
          <div>No return or claim without original bill slip.</div>
          <div style="margin-top: 8px; font-size: 14px; letter-spacing: 2px;">||| | |||| | |||| ||||</div>
          <div>* ${order.order_number} *</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(content);
  printWindow.document.close();
}
