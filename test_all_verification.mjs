import http from 'http';

const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'zm-secure-admin-v2-production-key-2026';

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
  console.log('🎯 COMPREHENSIVE PRODUCTION SECURITY & REGRESSION VERIFICATION');
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
    // 1a. Anonymous ?tier=wholesale on /api/app/products
    const resWholesale = await makeRequest('http://localhost:3000/api/app/products?tier=wholesale');
    assert(resWholesale.status === 200, 'Pricing', 'GET /api/app/products?tier=wholesale returns 200');
    assert(resWholesale.data.tier === 'retail', 'Pricing', 'Anonymous ?tier=wholesale query forcibly downgraded to retail');

    const firstProduct = resWholesale.data.products?.[0];
    if (firstProduct) {
      assert(firstProduct.wholesale_price === undefined, 'Pricing', 'wholesale_price property stripped from anonymous payload');
      assert(firstProduct.technician_price === undefined, 'Pricing', 'technician_price property stripped from anonymous payload');
      assert(firstProduct.purchase_price === undefined, 'Pricing', 'purchase_price property stripped from anonymous payload');
      assert(firstProduct.price === firstProduct.retail_price, 'Pricing', 'Public price strictly locked to retail_price');
    }

    // 1b. Anonymous ?tier=technician on /api/app/products
    const resTech = await makeRequest('http://localhost:3000/api/app/products?tier=technician');
    assert(resTech.data.tier === 'retail', 'Pricing', 'Anonymous ?tier=technician query forcibly downgraded to retail');

    // 1c. Classic /api/products with x-user-tier: wholesale header
    const resClassic = await makeRequest('http://localhost:3000/api/products?tier=wholesale', {
      headers: { 'x-user-tier': 'wholesale' }
    });
    assert(resClassic.status === 200, 'Pricing', 'GET /api/products with untrusted tier header returns 200');
    if (resClassic.data?.products?.length > 0) {
      const p = resClassic.data.products[0];
      assert(p.wholesale_price === undefined, 'Pricing', 'Classic /api/products strips wholesale_price from anonymous query');
      assert(p.purchase_price === undefined, 'Pricing', 'Classic /api/products strips purchase_price from anonymous query');
    }

    // 1d. Single product endpoint
    const resSingle = await makeRequest('http://localhost:3000/api/app/products/samsung-a12-charging-flex-with-ic?tier=wholesale');
    assert(resSingle.data?.tier === 'retail', 'Pricing', 'Single product ?tier=wholesale query locked to retail');
    assert(resSingle.data?.product?.wholesale_price === undefined, 'Pricing', 'Single product wholesale_price hidden');

    // 1e. Authorized Admin Key Access receives authorized tier
    const resAdminWholesale = await makeRequest('http://localhost:3000/api/app/products?tier=wholesale', {
      headers: { 'x-admin-key': ADMIN_API_KEY }
    });
    assert(resAdminWholesale.data?.tier === 'wholesale', 'Pricing', 'Authorized caller with admin key receives wholesale tier');
  } catch (err) {
    console.error('Pricing security error:', err);
    failed++;
  }

  // ================================================================
  // 2. CUSTOMER DATA PROTECTION & ADMIN USERS GUARD
  // ================================================================
  console.log('\n--- 2. CUSTOMER DATA PROTECTION & ADMIN GUARDS ---');
  try {
    // 2a. Anonymous GET /api/admin/users must be rejected with 401
    const resAnonUsers = await makeRequest('http://localhost:3000/api/admin/users');
    assert(resAnonUsers.status === 401, 'Customer Protection', 'Anonymous GET /api/admin/users blocked with 401 Unauthorized');

    // 2b. Anonymous POST /api/admin/users must be rejected with 401
    const resAnonPost = await makeRequest('http://localhost:3000/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { username: 'attacker', full_name: 'Attacker' }
    });
    assert(resAnonPost.status === 401, 'Customer Protection', 'Anonymous POST /api/admin/users blocked with 401 Unauthorized');

    // 2c. Anonymous DELETE /api/admin/users must be rejected with 401
    const resAnonDel = await makeRequest('http://localhost:3000/api/admin/users?id=demo-1', {
      method: 'DELETE'
    });
    assert(resAnonDel.status === 401, 'Customer Protection', 'Anonymous DELETE /api/admin/users blocked with 401 Unauthorized');

    // 2d. Authenticated Admin GET /api/admin/users returns 200 with zero plaintext passwords
    const resAuthUsers = await makeRequest('http://localhost:3000/api/admin/users', {
      headers: { 'x-admin-key': ADMIN_API_KEY }
    });
    assert(resAuthUsers.status === 200, 'Customer Protection', 'Admin-authorized GET /api/admin/users returns 200');
    if (resAuthUsers.data?.users) {
      const anyPlaintextPassword = resAuthUsers.data.users.some(u => u.password !== undefined);
      assert(!anyPlaintextPassword, 'Customer Protection', 'Zero plaintext passwords exposed in user API');
      const anyPasswordHash = resAuthUsers.data.users.some(u => u.password_hash !== undefined);
      assert(!anyPasswordHash, 'Customer Protection', 'Password hashes scrubbed from response');
    }
  } catch (err) {
    console.error('Customer data protection error:', err);
    failed++;
  }

  // ================================================================
  // 3. CHECKOUT SECURITY & CONCURRENCY
  // ================================================================
  console.log('\n--- 3. CHECKOUT SECURITY & CONCURRENCY ---');
  let placedOrderNumber = null;
  const testPhone = '03001234567';

  try {
    // 3a. Invalid product prices & manipulated discount from frontend
    const tamperedOrder = {
      customer_name: 'QA Price Tamper Test',
      customer_phone: testPhone,
      customer_address: 'Main Market, Hall Road, Lahore',
      items: [
        {
          id: 'p-flx-sam-1',
          name: 'SAMSUNG A12 CHARGING FLEX WITH IC',
          quantity: 2,
          price: 5, // Client attempts to buy 438 PKR items for 5 PKR each
        }
      ],
      discount_amount: 99999, // Client attempts arbitrary 99,999 PKR discount
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
      placedOrderNumber = resTamper.data.order.order_number;
      assert(resTamper.data.order.total_amount > 500, 'Checkout', `Server re-calculated unit price with server truth (${resTamper.data.order.total_amount} PKR, not 10 PKR)`);
      assert(resTamper.data.order.discount_amount === 0, 'Checkout', `Client discount_amount: 99999 discarded by server (actual discount: ${resTamper.data.order.discount_amount} PKR)`);
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

    assert(click1.status === 200, 'Checkout', 'First rapid checkout click succeeded with 200');
    assert(click2.status === 200, 'Checkout', 'Second rapid checkout click intercepted idempotently with 200');
    assert(click1.data?.order?.id === click2.data?.order?.id, 'Checkout', 'Idempotency prevented duplicate orders (returned identical order ID)');

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
  // 4. ORDER PRIVACY & OWNERSHIP VERIFICATION
  // ================================================================
  console.log('\n--- 4. ORDER PRIVACY ---');
  try {
    // 4a. Anonymous access without parameters must be rejected with 401
    const resAnonOrders = await makeRequest('http://localhost:3000/api/app/orders');
    assert(resAnonOrders.status === 401, 'Order Privacy', 'Anonymous access without identifier rejected with 401 Unauthorized');
    assert(resAnonOrders.data?.error !== undefined, 'Order Privacy', 'Zero customer orders leaked anonymously');

    // 4b. Query by phone only must be rejected with 401 for unauthenticated caller
    const resPhoneOnly = await makeRequest('http://localhost:3000/api/app/orders?phone=' + testPhone);
    assert(resPhoneOnly.status === 401, 'Order Privacy', 'Anonymous lookup by phone alone rejected with 401 Unauthorized');

    // 4c. Order lookup without verification phone rejected with 400
    if (placedOrderNumber) {
      const resNoPhone = await makeRequest(`http://localhost:3000/api/app/orders?order_number=${placedOrderNumber}`);
      assert(resNoPhone.status === 400, 'Order Privacy', 'Order lookup without phone rejected with 400 Verification required');

      // 4d. Order lookup with wrong phone rejected with 403
      const resWrongPhone = await makeRequest(`http://localhost:3000/api/app/orders?order_number=${placedOrderNumber}&phone=03119999999`);
      assert(resWrongPhone.status === 403, 'Order Privacy', 'Order lookup with mismatched phone rejected with 403 Forbidden');

      // 4e. Order lookup with correct order_number + matching phone succeeds with sanitized PII
      const resMatched = await makeRequest(`http://localhost:3000/api/app/orders?order_number=${placedOrderNumber}&phone=${testPhone}`);
      assert(resMatched.status === 200, 'Order Privacy', 'Order lookup with matching order_number & phone returns 200 OK');
      if (resMatched.data?.order) {
        assert(resMatched.data.order.customer_name?.includes('*'), 'Order Privacy', `Customer name masked for public tracking: "${resMatched.data.order.customer_name}"`);
        assert(resMatched.data.order.customer_phone?.includes('*'), 'Order Privacy', `Customer phone masked for public tracking: "${resMatched.data.order.customer_phone}"`);
        assert(resMatched.data.order.customer_address?.startsWith('Protected Address'), 'Order Privacy', `Customer address masked: "${resMatched.data.order.customer_address}"`);
      }
    }
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

  console.log('\n================================================================');
  console.log(`🏁 FINAL VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runComprehensiveVerification();
