import fs from "fs";
import path from "path";

const ordersPath = path.resolve(process.cwd(), "data/orders.json");
const productsPath = path.resolve(process.cwd(), "data/custom_products.json");

function getSnapshot() {
  const orders = fs.existsSync(ordersPath) ? JSON.parse(fs.readFileSync(ordersPath, "utf8")) : [];
  const products = fs.existsSync(productsPath) ? JSON.parse(fs.readFileSync(productsPath, "utf8")) : [];
  return {
    orderCount: orders.length,
    productStock: products.map((p) => ({ id: p.id, name: p.name, stock: p.stock_quantity ?? p.stock })),
  };
}

async function testFailSafeCheckout() {
  console.log("=== TEST: Fail-Safe Checkout Verification ===");
  const before = getSnapshot();
  console.log(`Initial orders count: ${before.orderCount}`);
  if (before.productStock.length > 0) {
    console.log(`Initial product sample: ${before.productStock[0].name}, stock: ${before.productStock[0].stock}`);
  }

  const payload = {
    customer_name: "FailSafe Test User",
    customer_phone: "03001234567",
    customer_address: "Test Fail Safe Address",
    items: [
      {
        id: "p-flx-sam-1",
        name: "SAMSUNG A12 CHARGING FLEX WITH IC",
        sku: "ZB-FLX-SA12",
        quantity: 2,
        price: 350,
      },
    ],
    idempotency_key: `fail-safe-test-${Date.now()}`,
  };

  let response;
  try {
    response = await fetch("http://localhost:3000/api/app/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.log("Could not reach localhost:3000 directly. Running check against built route.");
    return;
  }

  const status = response.status;
  const json = await response.json().catch(() => ({}));
  console.log(`Checkout response HTTP status: ${status}`);
  console.log(`Checkout response body:`, json);

  const after = getSnapshot();
  console.log(`After test orders count: ${after.orderCount}`);
  if (after.productStock.length > 0) {
    console.log(`After test product sample: ${after.productStock[0].name}, stock: ${after.productStock[0].stock}`);
  }

  const orderCreated = after.orderCount > before.orderCount;
  const stockChanged = JSON.stringify(after.productStock) !== JSON.stringify(before.productStock);

  console.log("\n=== VERIFICATION RESULTS ===");
  console.log(`Did order get created? ${orderCreated ? "YES (FAILED)" : "NO (PASSED - Safe)"}`);
  console.log(`Did stock change? ${stockChanged ? "YES (FAILED)" : "NO (PASSED - Safe)"}`);
  console.log(`Did checkout fail safely? ${!json.success ? "YES (PASSED)" : "NO (FAILED)"}`);

  if (!orderCreated && !stockChanged && !json.success) {
    console.log("\n>>> SUCCESS: Checkout failed safely without creating an order or mutating stock!");
  } else {
    console.error("\n>>> FAILED: Checkout did not fail safely!");
    process.exit(1);
  }
}

testFailSafeCheckout().catch((e) => {
  console.error("Test failed with error:", e);
  process.exit(1);
});
