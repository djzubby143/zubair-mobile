async function testLiveApi() {
  const baseUrl = "http://localhost:3000";

  console.log("==========================================================");
  console.log("--- TEST 1: Guest Request (No Tier Header) ---");
  console.log("==========================================================");
  const guestRes = await fetch(`${baseUrl}/api/products`);
  const guestJson = await guestRes.json();
  console.log("Guest API Status:", guestRes.status, "Tier:", guestJson.tier, "Total Products:", guestJson.products?.length);

  const guestItem = guestJson.products?.[0];
  console.log("Sample Item (Guest):", {
    name: guestItem?.name,
    price: guestItem?.price,
    retail_price: guestItem?.retail_price,
    wholesale_price: guestItem?.wholesale_price,
    technician_price: guestItem?.technician_price,
    purchase_price: guestItem?.purchase_price,
  });

  if (guestItem?.wholesale_price !== undefined || guestItem?.technician_price !== undefined || guestItem?.purchase_price !== undefined) {
    throw new Error("SECURITY FAILURE: Guest received hidden wholesale/technician/purchase prices!");
  }
  if (!guestItem?.retail_price || guestItem?.price !== guestItem?.retail_price) {
    throw new Error("Guest price must equal retail_price!");
  }

  console.log("\n==========================================================");
  console.log("--- TEST 2: Retail Customer Request (x-user-tier: retail) ---");
  console.log("==========================================================");
  const retailRes = await fetch(`${baseUrl}/api/products`, {
    headers: { "x-user-tier": "retail" },
  });
  const retailJson = await retailRes.json();
  console.log("Retail API Status:", retailRes.status, "Tier:", retailJson.tier, "Total Products:", retailJson.products?.length);

  const retailItem = retailJson.products?.[0];
  console.log("Sample Item (Retail):", {
    name: retailItem?.name,
    price: retailItem?.price,
    retail_price: retailItem?.retail_price,
    wholesale_price: retailItem?.wholesale_price,
    technician_price: retailItem?.technician_price,
    purchase_price: retailItem?.purchase_price,
  });

  if (retailItem?.wholesale_price !== undefined || retailItem?.technician_price !== undefined || retailItem?.purchase_price !== undefined) {
    throw new Error("SECURITY FAILURE: Retail customer received hidden wholesale/technician/purchase prices!");
  }
  if (!retailItem?.retail_price || retailItem?.price !== retailItem?.retail_price) {
    throw new Error("Retail user price must equal retail_price!");
  }

  console.log("\n==========================================================");
  console.log("--- TEST 3: Wholesale Customer Request (x-user-tier: wholesale) ---");
  console.log("==========================================================");
  const wsRes = await fetch(`${baseUrl}/api/products`, {
    headers: { "x-user-tier": "wholesale" },
  });
  const wsJson = await wsRes.json();
  console.log("Wholesale API Status:", wsRes.status, "Tier:", wsJson.tier, "Total Products:", wsJson.products?.length);

  const wsItem = wsJson.products?.[0];
  console.log("Sample Item (Wholesale):", {
    name: wsItem?.name,
    price: wsItem?.price,
    retail_price: wsItem?.retail_price,
    wholesale_price: wsItem?.wholesale_price,
    technician_price: wsItem?.technician_price,
    purchase_price: wsItem?.purchase_price,
  });

  if (wsItem?.technician_price !== undefined || wsItem?.purchase_price !== undefined || wsItem?.retail_price !== undefined) {
    throw new Error("SECURITY FAILURE: Wholesale customer received hidden technician/purchase/retail prices!");
  }
  if (!wsItem?.wholesale_price || wsItem?.price !== wsItem?.wholesale_price) {
    throw new Error("Wholesale user price must equal wholesale_price!");
  }

  console.log("\n==========================================================");
  console.log("--- TEST 4: Technician Customer Request (x-user-tier: technician) ---");
  console.log("==========================================================");
  const techRes = await fetch(`${baseUrl}/api/products`, {
    headers: { "x-user-tier": "technician" },
  });
  const techJson = await techRes.json();
  console.log("Technician API Status:", techRes.status, "Tier:", techJson.tier, "Total Products:", techJson.products?.length);

  const techItem = techJson.products?.[0];
  console.log("Sample Item (Technician):", {
    name: techItem?.name,
    price: techItem?.price,
    retail_price: techItem?.retail_price,
    wholesale_price: techItem?.wholesale_price,
    technician_price: techItem?.technician_price,
    purchase_price: techItem?.purchase_price,
  });

  if (techItem?.wholesale_price !== undefined || techItem?.purchase_price !== undefined || techItem?.retail_price !== undefined) {
    throw new Error("SECURITY FAILURE: Technician customer received hidden wholesale/purchase/retail prices!");
  }
  if (!techItem?.technician_price || techItem?.price !== techItem?.technician_price) {
    throw new Error("Technician user price must equal technician_price!");
  }

  console.log("\n==========================================================");
  console.log("--- TEST 5: Admin Request (x-user-tier: admin) ---");
  console.log("==========================================================");
  const adminRes = await fetch(`${baseUrl}/api/products`, {
    headers: { "x-user-tier": "admin" },
  });
  const adminJson = await adminRes.json();
  console.log("Admin API Status:", adminRes.status, "Tier:", adminJson.tier, "Total Products:", adminJson.products?.length);

  const adminItem = adminJson.products?.[0];
  console.log("Sample Item (Admin):", {
    name: adminItem?.name,
    price: adminItem?.price,
    retail_price: adminItem?.retail_price,
    wholesale_price: adminItem?.wholesale_price,
    technician_price: adminItem?.technician_price,
    purchase_price: adminItem?.purchase_price,
  });

  if (
    adminItem?.wholesale_price === undefined ||
    adminItem?.technician_price === undefined ||
    adminItem?.retail_price === undefined ||
    adminItem?.purchase_price === undefined
  ) {
    throw new Error("Admin must see ALL 4 prices!");
  }

  console.log("\n==========================================================");
  console.log("--- TEST 6: Single Product Detail API /api/products/[slug] ---");
  console.log("==========================================================");
  const slug = wsItem.slug || "samsung-a12-charging-flex-with-ic";

  // Detail for retail user
  const detailRetailRes = await fetch(`${baseUrl}/api/products/${slug}`, {
    headers: { "x-user-tier": "retail" },
  });
  const detailRetailJson = await detailRetailRes.json();
  console.log("Detail for Retail User:", {
    slug: detailRetailJson.product?.slug,
    price: detailRetailJson.product?.price,
    retail_price: detailRetailJson.product?.retail_price,
    wholesale_price: detailRetailJson.product?.wholesale_price,
  });
  if (detailRetailJson.product?.wholesale_price !== undefined) {
    throw new Error("SECURITY FAILURE: Product detail exposed wholesale_price to retail user!");
  }

  // Detail for wholesale user
  const detailWsRes = await fetch(`${baseUrl}/api/products/${slug}`, {
    headers: { "x-user-tier": "wholesale" },
  });
  const detailWsJson = await detailWsRes.json();
  console.log("Detail for Wholesale User:", {
    slug: detailWsJson.product?.slug,
    price: detailWsJson.product?.price,
    wholesale_price: detailWsJson.product?.wholesale_price,
    technician_price: detailWsJson.product?.technician_price,
  });
  if (detailWsJson.product?.technician_price !== undefined) {
    throw new Error("SECURITY FAILURE: Product detail exposed technician_price to wholesale user!");
  }

  console.log("\n>>> ALL LIVE HTTP API ENDPOINT TESTS PASSED WITH 100% SECURITY! <<<");
}

testLiveApi().catch((err) => {
  console.error("Live API test failed:", err);
  process.exit(1);
});
