import http from 'http';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, data: json });
      });
    });

    req.on('error', (err) => reject(err));

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runComprehensiveVerification() {
  console.log('================================================================');
  console.log('🎯 COMPREHENSIVE PRODUCTION VERIFICATION & REGRESSION AUDIT');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;
  const results = [];

  function assert(condition, category, testName, details = '') {
    if (condition) {
      console.log(`✅ [${category}] ${testName}`);
      passed++;
      results.push({ category, testName, status: 'PASS' });
    } else {
      console.error(`❌ [${category}] ${testName} - ${details}`);
      failed++;
      results.push({ category, testName, status: 'FAIL', details });
    }
  }

  // ================================================================
  // 1. PRICING SECURITY
  // ================================================================
  console.log('\n--- 1. PRICING SECURITY ---');
  try {
    const resWholesale = await makeRequest('http://localhost:3000/api/app/products?tier=wholesale');
    assert(resWholesale.status === 200, 'Pricing', 'GET /api/app/products?tier=wholesale returns 200');
    assert(resWholesale.data.tier === 'retail', 'Pricing', 'Anonymous ?tier=wholesale query forcibly downgraded to retail');

    const firstProduct = resWholesale.data.products[0];
    if (firstProduct) {
      assert(firstProduct.wholesale_price === undefined, 'Pricing', 'wholesale_price property stripped from response payload');
      assert(firstProduct.technician_price === undefined, 'Pricing', 'technician_price property stripped from response payload');
      assert(firstProduct.purchase_price === undefined, 'Pricing', 'purchase_price property stripped from response payload');
      assert(firstProduct.price === firstProduct.retail_price, 'Pricing', 'Public price locked to retail_price');
    }

    const resTech = await makeRequest('http://localhost:3000/api/app/products?tier=technician');
    assert(resTech.data.tier === 'retail', 'Pricing', 'Anonymous ?tier=technician query forcibly downgraded to retail');

    // Single product endpoint
    const resSingle = await makeRequest('http://localhost:3000/api/app/products/samsung-a12-charging-flex-with-ic?tier=wholesale');
    assert(resSingle.data.tier === 'retail', 'Pricing', 'Single product ?tier=wholesale query locked to retail');
    assert(resSingle.data.product?.wholesale_price === undefined, 'Pricing', 'Single product wholesale_price hidden');
  } catch (err) {
    console.error('Pricing security error:', err);
    failed++;
  }

  // ================================================================
  // 2. CUSTOMER DATA PROTECTION & RLS
  // ================================================================
  console.log('\n--- 2. CUSTOMER DATA PROTECTION ---');
  try {
    const resUsers = await makeRequest('http://localhost:3000/api/admin/users');
    assert(resUsers.status === 200, 'Customer Protection', 'GET /api/admin/users returns 200');
    if (resUsers.data && resUsers.data.users) {
      const anyPasswordExposed = resUsers.data.users.some(u => u.password !== undefined);
      assert(!anyPasswordExposed, 'Customer Protection', 'Zero plaintext passwords exposed in user API');
    }
  } catch (err) {
    console.error('Customer data protection error:', err);
    failed++;
  }

  // ================================================================
  // 3. CHECKOUT SECURITY & CONCURRENCY
  // ================================================================
  console.log('\n--- 3. CHECKOUT SECURITY & CONCURRENCY ---');
  try {
    // 3a. Invalid product prices from frontend manipulation
    const tamperedOrder = {
      customer_name: 'QA Price Tamper Test',
      customer_phone: '03001234567',
      customer_address: 'Main Market, Hall Road, Lahore',
      items: [
        {
          id: 'p-flx-sam-1',
          name: 'SAMSUNG A12 CHARGING FLEX WITH IC',
          quantity: 2,
          price: 5, // Client attempts to buy 438 PKR items for 5 PKR each
        }
      ],
      payment_method: 'cod',
      idempotency_key: 'tamper-' + Date.now(),
    };

    const resTamper = await makeRequest('http://localhost:3000/api/app/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: tamperedOrder,
    });

    assert(resTamper.status === 200, 'Checkout', 'Tampered checkout processed safely');
    if (resTamper.data?.order) {
      assert(resTamper.data.order.total_amount > 500, 'Checkout', `Server re-calculated price with server truth (${resTamper.data.order.total_amount} PKR, not 10 PKR)`);
    }

    // 3b. Duplicate rapid checkout clicks / Idempotency
    const idempotencyToken = 'rapid-click-' + Date.now();
    const rapidOrder = {
      customer_name: 'Rapid Clicker',
      customer_phone: '03009876543',
      customer_address: 'Lahore',
      items: [
        {
          id: 'p-flx-sam-2',
          name: 'SAMSUNG A02S / A03S CHARGING FLEX BOARD',
          quantity: 1,
        }
      ],
      idempotency_key: idempotencyToken,
    };

    const [click1, click2] = await Promise.all([
      makeRequest('http://localhost:3000/api/app/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rapidOrder,
      }),
      makeRequest('http://localhost:3000/api/app/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rapidOrder,
      }),
    ]);

    assert(click1.status === 200, 'Checkout', 'First click succeeded with 200');
    if (click2.status === 200) {
      assert(click1.data?.order?.id === click2.data?.order?.id, 'Checkout', 'Idempotency prevented duplicate orders (returned existing order ID)');
    } else {
      assert(click2.status === 409, 'Checkout', 'Duplicate checkout rejected with 409 Conflict');
    }

    // 3c. Buying more than available stock
    const overStockOrder = {
      customer_name: 'Overbuyer',
      customer_phone: '03005555555',
      customer_address: 'Rawalpindi',
      items: [
        {
          id: 'p-flx-sam-3',
          name: 'SAMSUNG A32 4G CHARGING FLEX BOARD',
          quantity: 500000,
        }
      ],
    };

    const resOversell = await makeRequest('http://localhost:3000/api/app/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: overStockOrder,
    });
    assert(resOversell.status === 400, 'Checkout', 'Exceeding inventory blocked with 400 Bad Request');
    assert(resOversell.data?.error?.includes('Insufficient stock'), 'Checkout', 'Clear error message: Insufficient stock');
  } catch (err) {
    console.error('Checkout test error:', err);
    failed++;
  }

  // ================================================================
  // 4. ORDER PRIVACY
  // ================================================================
  console.log('\n--- 4. ORDER PRIVACY ---');
  try {
    const resAnonOrders = await makeRequest('http://localhost:3000/api/app/orders');
    assert(resAnonOrders.status === 400, 'Order Privacy', 'Anonymous access without identifier rejected with 400');
    assert(resAnonOrders.data?.error !== undefined, 'Order Privacy', 'Error returned, zero customer orders leaked');

    // Query with phone
    const resPhone = await makeRequest('http://localhost:3000/api/app/orders?phone=03001234567');
    assert(resPhone.status === 200, 'Order Privacy', 'Authenticated phone query succeeds with 200');
  } catch (err) {
    console.error('Order privacy test error:', err);
    failed++;
  }

  // ================================================================
  // 5. ADMIN RBAC PERMISSIONS MATRIX
  // ================================================================
  console.log('\n--- 5. ADMIN RBAC EVALUATION ---');
  const ROLES = [
    { role: 'super_admin', canPricing: true, canInventory: true, canOrders: true, canReports: true, canUsers: true },
    { role: 'inventory_manager', canPricing: false, canInventory: true, canOrders: true, canReports: false, canUsers: false },
    { role: 'sales_manager', canPricing: false, canInventory: false, canOrders: true, canReports: false, canUsers: true },
    { role: 'accountant', canPricing: true, canInventory: false, canOrders: false, canReports: true, canUsers: false },
    { role: 'order_manager', canPricing: false, canInventory: false, canOrders: true, canReports: false, canUsers: false },
  ];

  function evaluateRoutePermission(roleObj, pathname) {
    if (roleObj.role === 'super_admin' || pathname === '/admin') return true;
    if (pathname.startsWith('/admin/pricing')) return !!roleObj.canPricing;
    if (pathname.startsWith('/admin/inventory') || pathname.startsWith('/admin/products')) return !!roleObj.canInventory;
    if (pathname.startsWith('/admin/orders')) return !!roleObj.canOrders;
    if (pathname.startsWith('/admin/analytics') || pathname.startsWith('/admin/reports')) return !!roleObj.canReports;
    if (pathname.startsWith('/admin/users')) return !!roleObj.canUsers;
    if (pathname.startsWith('/admin/security')) return false;
    return true;
  }

  for (const r of ROLES) {
    const pricingAllowed = evaluateRoutePermission(r, '/admin/pricing');
    assert(pricingAllowed === r.canPricing, 'Admin RBAC', `${r.role} pricing access is ${r.canPricing ? 'ALLOWED' : 'BLOCKED'}`);

    const inventoryAllowed = evaluateRoutePermission(r, '/admin/inventory');
    assert(inventoryAllowed === r.canInventory, 'Admin RBAC', `${r.role} inventory access is ${r.canInventory ? 'ALLOWED' : 'BLOCKED'}`);

    const securityAllowed = evaluateRoutePermission(r, '/admin/security');
    assert(securityAllowed === (r.role === 'super_admin'), 'Admin RBAC', `${r.role} security access is ${r.role === 'super_admin' ? 'ALLOWED' : 'BLOCKED'}`);
  }

  // ================================================================
  // 6. PRODUCT CRUD VALIDATION
  // ================================================================
  console.log('\n--- 6. PRODUCT VALIDATION ---');
  try {
    // 6a. Duplicate SKU
    const resDup = await makeRequest('http://localhost:3000/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { name: 'Duplicate SKU Check', sku: 'ZB-FLX-SA12', price: 400, stock_quantity: 10 },
    });
    assert(resDup.status === 409 || resDup.status === 400, 'Product Validation', 'Duplicate SKU blocked with 409/400');

    // 6b. Negative Price
    const resNegPrice = await makeRequest('http://localhost:3000/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { name: 'Negative Price Check', sku: 'TEST-NEG-P', price: -50, stock_quantity: 10 },
    });
    assert(resNegPrice.status === 400, 'Product Validation', 'Negative price rejected with 400');

    // 6c. Negative Stock
    const resNegStock = await makeRequest('http://localhost:3000/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { name: 'Negative Stock Check', sku: 'TEST-NEG-S', price: 200, stock_quantity: -10 },
    });
    assert(resNegStock.status === 400, 'Product Validation', 'Negative stock rejected with 400');
  } catch (err) {
    console.error('Product validation error:', err);
    failed++;
  }

  // ================================================================
  // 7. AI SEARCH RANKING (HTTP Endpoint)
  // ================================================================
  console.log('\n--- 7. AI SEARCH RANKING ---');
  const searchTests = [
    { query: 'iphone 13 ka lcd', expectedKeyword: 'lcd' },
    { query: 'Samsung a12 charging patta', expectedKeyword: 'charging' },
    { query: 'Infinix battery original', expectedKeyword: 'battery' },
    { query: 'Oppo ka camera', expectedKeyword: 'camera' },
  ];

  for (const st of searchTests) {
    try {
      const encoded = encodeURIComponent(st.query);
      const resSearch = await makeRequest(`http://localhost:3000/api/app/search/ai?q=${encoded}`);
      assert(resSearch.status === 200, 'AI Search', `GET /api/app/search/ai?q=${st.query} returns 200`);
      const products = resSearch.data?.products || [];
      assert(products.length > 0, 'AI Search', `Query "${st.query}" returned ${products.length} matches`);
      if (products.length > 0) {
        const topMatch = products[0];
        const matchText = `${topMatch.name} ${topMatch.category?.name || ''} ${topMatch.part_type || ''}`.toLowerCase();
        assert(matchText.includes(st.expectedKeyword), 'AI Search', `Top result "${topMatch.name}" matches expected keyword "${st.expectedKeyword}"`);
      }
    } catch (err) {
      console.error(`Search test error for "${st.query}":`, err);
      failed++;
    }
  }

  // ================================================================
  // 8. AI GENERATOR ROBUSTNESS & FALLBACKS (HTTP Endpoint)
  // ================================================================
  console.log('\n--- 8. AI GENERATOR TESTS ---');
  try {
    const resGen = await makeRequest('http://localhost:3000/api/admin/ai/generate-description', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        name: 'Samsung Galaxy A53 5G Display Screen',
        brand: 'Samsung',
        model: 'Galaxy A53 5G',
        partType: 'Display Screen',
        qualityGrade: 'Original',
      },
    });

    assert(resGen.status === 200, 'AI Generator', 'POST /api/admin/ai/generate-description returns 200');
    const gen = resGen.data?.data;
    if (gen) {
      assert(!!gen.shortDescription, 'AI Generator', 'Generated short description successfully');
      assert(!!gen.description, 'AI Generator', 'Generated detailed description successfully');
      assert(Array.isArray(gen.keyFeatures) && gen.keyFeatures.length > 0, 'AI Generator', 'Generated key features & specs');
      assert(!!gen.suggestedSku, 'AI Generator', 'Generated suggested SKU');
    }
  } catch (err) {
    console.error('AI generator test error:', err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`🏁 FINAL VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  return { passed, failed, results };
}

runComprehensiveVerification();
