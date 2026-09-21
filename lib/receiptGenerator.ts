import { Order } from "@/lib/orders";

export type ThermalPaperWidth = 68 | 58 | 80;

/**
 * Generate and download high-resolution Thermal Receipt JPEG image
 * Width tailored for thermal printers (Default 68mm = 480px canvas at 203 DPI)
 */
export async function generateReceiptJpeg(
  order: Order,
  paperWidth: ThermalPaperWidth = 68,
  logoSrc = "/logo.jpg"
): Promise<void> {
  if (typeof window === "undefined") return;

  // Pre-load logo image
  const logoImg = new Image();
  logoImg.crossOrigin = "anonymous";
  await new Promise<void>((resolve) => {
    logoImg.onload = () => resolve();
    logoImg.onerror = () => resolve(); // Continue even if logo fails
    logoImg.src = logoSrc;
  });

  // Canvas dimensions based on paper width
  // 68mm paper -> 480px printable width (203 DPI)
  // 58mm paper -> 384px printable width
  // 80mm paper -> 576px printable width
  const canvasWidth = paperWidth === 58 ? 384 : paperWidth === 80 ? 576 : 480;
  const paddingX = 16;
  const contentWidth = canvasWidth - paddingX * 2;

  // Calculate dynamic canvas height based on item count
  const itemHeightEstimate = order.items.length * 40;
  const canvasHeight = 720 + itemHeightEstimate;

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background - pure white for maximum thermal head contrast
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.fillStyle = "#000000";
  ctx.strokeStyle = "#000000";
  ctx.textBaseline = "top";

  let y = 16;

  // 1. Draw Official Logo if available
  if (logoImg.complete && logoImg.naturalWidth > 0) {
    const logoSize = paperWidth === 58 ? 48 : 58;
    ctx.drawImage(logoImg, (canvasWidth - logoSize) / 2, y, logoSize, logoSize);
    y += logoSize + 8;
  }

  // 2. Shop Header
  ctx.textAlign = "center";
  ctx.font = "bold 20px 'Courier New', monospace";
  ctx.fillText("ZUBAIR MOBILE", canvasWidth / 2, y);
  y += 24;

  ctx.font = "bold 11px 'Courier New', monospace";
  ctx.fillText("REPAIR SERVICES & SPARE PARTS", canvasWidth / 2, y);
  y += 16;

  ctx.font = "10.5px 'Courier New', monospace";
  ctx.fillText("Shop No. B16, Chand Plaza, Garjakhi Darwaza", canvasWidth / 2, y);
  y += 14;
  ctx.fillText("Gujranwala, Punjab, Pakistan", canvasWidth / 2, y);
  y += 16;

  ctx.font = "bold 13px 'Courier New', monospace";
  ctx.fillText("WhatsApp / Call: 0345-8032600", canvasWidth / 2, y);
  y += 22;

  // Vector Dashed and Double Lines (Never wrap or misalign)
  const drawDashedLine = (currY: number) => {
    ctx.beginPath();
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1;
    ctx.moveTo(paddingX, currY);
    ctx.lineTo(canvasWidth - paddingX, currY);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const drawDoubleLine = (currY: number) => {
    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.lineWidth = 1.5;
    ctx.moveTo(paddingX, currY);
    ctx.lineTo(canvasWidth - paddingX, currY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(paddingX, currY + 3);
    ctx.lineTo(canvasWidth - paddingX, currY + 3);
    ctx.stroke();
  };

  drawDashedLine(y);
  y += 12;

  // 3. Order & Customer Info
  ctx.textAlign = "left";
  ctx.font = "bold 11px 'Courier New', monospace";
  const dateStr = new Date(order.created_at).toLocaleDateString("en-PK", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = new Date(order.created_at).toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
  });

  ctx.fillText(`ORDER: #${order.order_number}`, paddingX, y);
  ctx.textAlign = "right";
  ctx.fillText(`${dateStr} ${timeStr}`, canvasWidth - paddingX, y);
  y += 18;

  ctx.textAlign = "left";
  ctx.font = "11px 'Courier New', monospace";
  ctx.fillText(`CUSTOMER: ${order.customer_name}`, paddingX, y);
  y += 16;

  if (order.shop_name) {
    ctx.fillText(`SHOP:     ${order.shop_name}`, paddingX, y);
    y += 16;
  }

  ctx.fillText(`PHONE:    ${order.customer_phone}`, paddingX, y);
  y += 16;

  // Address (with clean truncation or wrapping)
  const maxAddrChars = paperWidth === 58 ? 32 : 40;
  ctx.fillText(`ADDRESS:  ${order.customer_address.slice(0, maxAddrChars)}`, paddingX, y);
  y += 16;
  if (order.customer_address.length > maxAddrChars) {
    ctx.fillText(`          ${order.customer_address.slice(maxAddrChars, maxAddrChars * 2)}`, paddingX, y);
    y += 16;
  }

  drawDoubleLine(y);
  y += 14;

  // 4. Table Header
  // Columns: QTY (left) | ITEM (left) | RATE (right) | TOTAL (right)
  const colQtyX = paddingX;
  const colItemX = paddingX + 38;
  const colRateX = canvasWidth - paddingX - 90;
  const colTotalX = canvasWidth - paddingX;

  ctx.font = "bold 11px 'Courier New', monospace";
  ctx.textAlign = "left";
  ctx.fillText("QTY", colQtyX, y);
  ctx.fillText("ITEM DESCRIPTION", colItemX, y);
  ctx.textAlign = "right";
  ctx.fillText("RATE", colRateX, y);
  ctx.fillText("TOTAL", colTotalX, y);
  y += 16;

  drawDashedLine(y);
  y += 12;

  // 5. Items Loop
  order.items.forEach((item) => {
    // Qty
    ctx.textAlign = "left";
    ctx.font = "bold 11px 'Courier New', monospace";
    ctx.fillText(`${item.quantity}x`, colQtyX, y);

    // Item Name (fit within column width without overflowing)
    ctx.font = "10.5px 'Courier New', monospace";
    const maxTitleLength = paperWidth === 58 ? 16 : 22;
    const displayName =
      item.name.length > maxTitleLength ? item.name.slice(0, maxTitleLength - 1) + "…" : item.name;
    ctx.fillText(displayName.toUpperCase(), colItemX, y);

    // Rate
    ctx.textAlign = "right";
    ctx.fillText(`${item.price.toLocaleString()}`, colRateX, y);

    // Amount
    const amount = item.price * item.quantity;
    ctx.font = "bold 11px 'Courier New', monospace";
    ctx.fillText(`Rs.${amount.toLocaleString()}`, colTotalX, y);
    y += 20;

    // SKU sub-line if available
    if (item.sku) {
      ctx.textAlign = "left";
      ctx.font = "9px 'Courier New', monospace";
      ctx.fillText(`    [SKU: ${item.sku}]`, colItemX, y - 5);
      y += 12;
    }
  });

  drawDoubleLine(y);
  y += 14;

  // 6. Totals
  ctx.textAlign = "left";
  ctx.font = "11px 'Courier New', monospace";
  ctx.fillText(`TOTAL ITEMS: ${order.total_items}`, paddingX, y);
  ctx.textAlign = "right";
  ctx.fillText(`SUBTOTAL: Rs. ${order.total_amount.toLocaleString()}`, canvasWidth - paddingX, y);
  y += 18;

  ctx.textAlign = "left";
  ctx.fillText("CARGO / DELIVERY:", paddingX, y);
  ctx.textAlign = "right";
  ctx.fillText("PAY ON ARRIVAL", canvasWidth - paddingX, y);
  y += 20;

  drawDashedLine(y);
  y += 14;

  // Grand Total in Large Bold
  ctx.textAlign = "left";
  ctx.font = "bold 15px 'Courier New', monospace";
  ctx.fillText("GRAND TOTAL:", paddingX, y);
  ctx.textAlign = "right";
  ctx.font = "bold 17px 'Courier New', monospace";
  ctx.fillText(`Rs. ${order.total_amount.toLocaleString()}`, canvasWidth - paddingX, y);
  y += 26;

  drawDoubleLine(y);
  y += 16;

  // 7. Footer Notice
  ctx.textAlign = "center";
  ctx.font = "bold 11px 'Courier New', monospace";
  ctx.fillText("*** SHUKRIYA / THANK YOU ***", canvasWidth / 2, y);
  y += 16;

  ctx.font = "9.5px 'Courier New', monospace";
  ctx.fillText("Genuine Mobile Spare Parts Guaranteed", canvasWidth / 2, y);
  y += 14;
  ctx.fillText("No returns/exchange without original bill slip.", canvasWidth / 2, y);
  y += 14;
  ctx.fillText("Zubair Mobile | Gujranwala | 0345-8032600", canvasWidth / 2, y);
  y += 20;

  // Simulated POS Barcode
  ctx.font = "16px monospace";
  ctx.fillText(`||| | ||||| |||| || |||||| | |||`, canvasWidth / 2, y);
  y += 16;
  ctx.font = "10px 'Courier New', monospace";
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
 * Print order directly to standard Thermal POS Printer
 * Specially formatted for 68mm (and compatible with 58mm / 80mm rolls)
 */
export function printThermalReceipt(
  order: Order,
  paperWidth: ThermalPaperWidth = 68,
  logoSrc = "/logo.jpg"
): void {
  if (typeof window === "undefined") return;

  const dateStr = new Date(order.created_at).toLocaleDateString("en-PK", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = new Date(order.created_at).toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const printWindow = window.open("", "_blank", "width=400,height=600");
  if (!printWindow) {
    alert("Please allow popups to print the thermal receipt.");
    return;
  }

  // Width calculations for 68mm (printable ~60mm), 58mm (printable ~48mm), 80mm (printable ~72mm)
  const pageCssWidth = `${paperWidth}mm`;
  const bodyCssWidth = paperWidth === 58 ? "50mm" : paperWidth === 80 ? "72mm" : "60mm";

  const itemsHtml = order.items
    .map(
      (item) => `
    <tr>
      <td class="col-qty">${item.quantity}x</td>
      <td class="col-item">
        <div class="item-name">${item.name.toUpperCase()}</div>
        ${item.sku ? `<div class="item-sku">[SKU: ${item.sku}]</div>` : ""}
      </td>
      <td class="col-rate">${item.price.toLocaleString()}</td>
      <td class="col-total">Rs.${(item.price * item.quantity).toLocaleString()}</td>
    </tr>
  `
    )
    .join("");

  const content = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Receipt #${order.order_number}</title>
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          @page {
            size: ${pageCssWidth} auto;
            margin: 0mm;
          }

          @media print {
            html, body {
              width: ${bodyCssWidth} !important;
              max-width: ${bodyCssWidth} !important;
              margin: 0 auto !important;
              padding: 1.5mm !important;
            }
          }

          body {
            font-family: 'Courier New', Courier, monospace, monospace;
            font-size: 10px;
            line-height: 1.25;
            color: #000000;
            background: #ffffff;
            width: ${bodyCssWidth};
            max-width: ${bodyCssWidth};
            margin: 0 auto;
            padding: 4px 2px;
            word-break: break-word;
            overflow: hidden;
          }

          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .font-bold { font-weight: bold; }
          .nowrap { white-space: nowrap; }

          .divider {
            border-top: 1px dashed #000000;
            margin: 4px 0;
            width: 100%;
          }

          .double-divider {
            border-top: 2px solid #000000;
            margin: 4px 0;
            width: 100%;
          }

          .flex-between {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            width: 100%;
          }

          .logo-img {
            max-width: 48px;
            max-height: 48px;
            object-fit: contain;
            margin: 0 auto 3px auto;
            display: block;
          }

          .shop-title {
            font-size: 16px;
            font-weight: 900;
            letter-spacing: 0.5px;
            line-height: 1.1;
          }

          .shop-sub {
            font-size: 9px;
            font-weight: bold;
            margin-top: 1px;
          }

          .shop-addr {
            font-size: 8.5px;
            margin-top: 2px;
            line-height: 1.2;
          }

          .shop-phone {
            font-size: 10px;
            font-weight: bold;
            margin-top: 2px;
          }

          .meta-section {
            font-size: 9.5px;
            line-height: 1.3;
            margin: 3px 0;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5px;
            margin: 2px 0;
          }

          th {
            border-bottom: 1px dashed #000000;
            padding: 2px 0;
            font-weight: bold;
            font-size: 9px;
          }

          td {
            padding: 2.5px 0;
            vertical-align: top;
          }

          .col-qty {
            width: 13%;
            font-weight: bold;
            text-align: left;
            white-space: nowrap;
          }

          .col-item {
            width: 47%;
            padding-right: 2px;
          }

          .item-name {
            font-size: 9.5px;
            line-height: 1.15;
            word-break: break-word;
          }

          .item-sku {
            font-size: 8px;
            color: #222222;
            margin-top: 1px;
          }

          .col-rate {
            width: 18%;
            text-align: right;
            white-space: nowrap;
            padding-right: 2px;
          }

          .col-total {
            width: 22%;
            text-align: right;
            font-weight: bold;
            white-space: nowrap;
          }

          .grand-total {
            font-size: 13px;
            font-weight: 900;
            margin-top: 2px;
          }

          .footer-section {
            font-size: 8.5px;
            line-height: 1.2;
            margin-top: 4px;
          }

          .barcode {
            font-size: 13px;
            letter-spacing: 2px;
            margin-top: 4px;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="text-center">
          <img src="${logoSrc}" class="logo-img" alt="Logo" onerror="this.style.display='none'" />
          <div class="shop-title">ZUBAIR MOBILE</div>
          <div class="shop-sub">REPAIR SERVICES & SPARE PARTS</div>
          <div class="shop-addr">Shop B16, Chand Plaza, Garjakhi Darwaza, Gujranwala</div>
          <div class="shop-phone">WhatsApp: 0345-8032600</div>
        </div>

        <div class="divider"></div>

        <!-- Order & Customer Meta -->
        <div class="meta-section">
          <div class="flex-between">
            <span class="font-bold">ORDER #${order.order_number}</span>
            <span class="nowrap">${dateStr} ${timeStr}</span>
          </div>
          <div style="margin-top: 2px;"><strong>CUSTOMER:</strong> ${order.customer_name}</div>
          ${order.shop_name ? `<div><strong>SHOP:</strong> ${order.shop_name}</div>` : ""}
          <div><strong>PHONE:</strong> ${order.customer_phone}</div>
          <div><strong>ADDRESS:</strong> ${order.customer_address}</div>
        </div>

        <div class="double-divider"></div>

        <!-- Itemized Table -->
        <table>
          <thead>
            <tr>
              <th class="text-left" style="width: 13%;">QTY</th>
              <th class="text-left" style="width: 47%;">ITEM</th>
              <th class="text-right" style="width: 18%;">RATE</th>
              <th class="text-right" style="width: 22%;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="double-divider"></div>

        <!-- Totals -->
        <div style="font-size: 9.5px; line-height: 1.35;">
          <div class="flex-between">
            <span>TOTAL ITEMS:</span>
            <span class="font-bold">${order.total_items}</span>
          </div>
          <div class="flex-between">
            <span>SUBTOTAL:</span>
            <span class="font-bold">Rs. ${order.total_amount.toLocaleString()}</span>
          </div>
          <div class="flex-between">
            <span>CARGO / DELIVERY:</span>
            <span>PAY ON ARRIVAL</span>
          </div>
        </div>

        <div class="divider"></div>

        <div class="flex-between grand-total">
          <span>GRAND TOTAL:</span>
          <span>Rs. ${order.total_amount.toLocaleString()}</span>
        </div>

        <div class="double-divider"></div>

        <!-- Footer Notice -->
        <div class="text-center footer-section">
          <div class="font-bold" style="font-size: 10px;">*** SHUKRIYA / THANK YOU ***</div>
          <div style="margin-top: 2px;">Genuine Tested Spare Parts Guaranteed</div>
          <div>No return or claim without original bill slip.</div>
          <div class="barcode">||| | |||| | |||| ||||</div>
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
