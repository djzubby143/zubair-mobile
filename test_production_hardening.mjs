import http from "http";
import { fork } from "child_process";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { verifyPassword, hashPassword, hashPasswordSync } from "./lib/passwordAuth.ts";

const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "zm-secure-admin-v2-production-key-2026";

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || "GET",
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, data: json });
      });
    });

    req.on("error", (err) => reject(err));

    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runHardeningSuite() {
  console.log("================================================================");
  console.log("🛡️ PRODUCTION HARDENING: CONCURRENCY, BCRYPT & RATE LIMIT TESTS");
  console.log("================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, category, testName, details = "") {
    if (condition) {
      console.log(`✅ [${category}] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [${category}] ${testName} - ${details}`);
      failed++;
    }
  }

  // ================================================================
  // 1. ADMIN KEY ENVIRONMENT & BROWSER EXPOSURE AUDIT
  // ================================================================
  console.log("--- 1. ADMIN KEY EXPOSURE AUDIT ---");
  try {
    const envContent = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf-8") : "";
    const hasNextPublicAdminKey = /NEXT_PUBLIC_.*ADMIN.*KEY/i.test(envContent);
    assert(!hasNextPublicAdminKey, "Key Audit", "Zero NEXT_PUBLIC admin keys in .env.local");

    // Scan client pages for any hardcoded admin keys
    const clientFiles = ["app/login/page.tsx", "app/page.tsx", "app/cart/page.tsx"];
    let clientExposureFound = false;
    for (const cf of clientFiles) {
      if (fs.existsSync(cf)) {
        const cContent = fs.readFileSync(cf, "utf-8");
        if (cContent.includes("zm-secure-admin") || cContent.includes("ADMIN_API_KEY")) {
          clientExposureFound = true;
        }
      }
    }
    assert(!clientExposureFound, "Key Audit", "Client storefront code has zero hardcoded admin keys");
  } catch (err) {
    console.error("Key audit error:", err);
    failed++;
  }

  // ================================================================
  // 2. BCRYPT PASSWORD HASHING & ZERO-DOWNTIME MIGRATION
  // ================================================================
  console.log("\n--- 2. BCRYPT PASSWORD HASHING & MIGRATION ---");
  try {
    const testPlain = "SuperSecretPass2026!";
    const modernHash = await hashPassword(testPlain);
    assert(modernHash.startsWith("$2a$") || modernHash.startsWith("$2b$"), "Bcrypt", "Passwords hashed using Bcrypt ($2a$ / $2b$)");

    const matchCheck = await verifyPassword(testPlain, modernHash);
    assert(matchCheck.valid === true && matchCheck.needsRehash === false, "Bcrypt", "Bcrypt password verified correctly without rehash needed");

    // Test legacy SHA-256 hash migration path
    const legacySalt = process.env.PASSWORD_SALT || "zm_secure_salt_2026_pk";
    const crypto = await import("crypto");
    const legacySha256 = crypto.createHash("sha256").update(testPlain + legacySalt).digest("hex");

    const legacyVerify = await verifyPassword(testPlain, legacySha256);
    assert(legacyVerify.valid === true, "Bcrypt Migration", "Legacy SHA-256 password successfully verified");
    assert(legacyVerify.needsRehash === true, "Bcrypt Migration", "Legacy SHA-256 flagged for automatic Bcrypt upgrade (needsRehash: true)");

    // Test wrong password
    const wrongVerify = await verifyPassword("WrongPassword123", modernHash);
    assert(wrongVerify.valid === false, "Bcrypt", "Wrong password correctly rejected");
  } catch (err) {
    console.error("Bcrypt test error:", err);
    failed++;
  }

  // ================================================================
  // 3. RATE LIMITING AUDIT
  // ================================================================
  console.log("\n--- 3. RATE LIMITING AUDIT ---");
  try {
    // 3a. Guest order tracking rate limiting
    console.log("Testing guest order tracking rate limiter (burst 15 requests)...");
    let hit429Guest = false;
    for (let i = 0; i < 15; i++) {
      const res = await makeRequest("http://localhost:3000/api/app/orders?order_number=ZM-TEST&phone=03001234567");
      if (res.status === 429) {
        hit429Guest = true;
        break;
      }
    }
    assert(hit429Guest, "Rate Limit", "Guest order tracking strictly enforces rate limiting (HTTP 429 returned on burst)");

    // 3b. Admin authentication rate limiting
    console.log("Testing login brute-force limiter (burst 18 requests)...");
    let hit429Login = false;
    for (let i = 0; i < 18; i++) {
      const res = await makeRequest("http://localhost:3000/api/app/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: { email: `test_${i}@example.com`, password: "wrong" },
      });
      if (res.status === 429) {
        hit429Login = true;
        break;
      }
    }
    assert(hit429Login, "Rate Limit", "Login route strictly throttles brute-force attempts (HTTP 429 returned on burst)");
  } catch (err) {
    console.error("Rate limit test error:", err);
    failed++;
  }

  // ================================================================
  // 4. CROSS-PROCESS CONCURRENT CHECKOUT RACE CONDITION TEST
  // ================================================================
  console.log("\n--- 4. MULTI-PROCESS CONCURRENT CHECKOUT ATOMICITY ---");
  try {
    // Find a valid product with ID and SKU
    const customProdsPath = path.resolve(process.cwd(), "data", "custom_products.json");
    let customProds = JSON.parse(fs.readFileSync(customProdsPath, "utf-8"));
    const testProd = customProds.find((p) => p.id && p.sku) || customProds[1];
    const originalStock = testProd.stock_quantity;
    testProd.stock_quantity = 1;
    fs.writeFileSync(customProdsPath, JSON.stringify(customProds, null, 2), "utf-8");

    console.log(`Setting product "${testProd.name}" (${testProd.id}) stock to exactly 1. Spawning 2 separate OS child processes...`);

    // Helper to spawn a separate Node process that sends a checkout request
    const spawnCheckoutWorker = (workerId) => {
      return new Promise((resolve) => {
        const workerScript = `
          const http = require('http');
          const order = {
            customer_name: 'Worker Process ${workerId}',
            customer_phone: '0300111222' + '${workerId}',
            customer_address: 'Process Address ${workerId}',
            items: [{ id: '${testProd.id}', name: '${testProd.name}', quantity: 1 }],
            payment_method: 'cod',
            idempotency_key: 'proc-' + '${workerId}' + '-' + Date.now()
          };
          const req = http.request({
            hostname: 'localhost', port: 3000, path: '/api/app/checkout', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
              process.send({ workerId: ${workerId}, status: res.statusCode, body: data });
            });
          });
          req.on('error', err => process.send({ workerId: ${workerId}, error: err.message }));
          req.write(JSON.stringify(order));
          req.end();
        `;

        const child = fork("-e", [workerScript], { stdio: ["pipe", "pipe", "pipe", "ipc"] });
        child.on("message", (msg) => {
          resolve(msg);
        });
      });
    };

    // Execute both separate Node processes simultaneously
    const [procResult1, procResult2] = await Promise.all([
      spawnCheckoutWorker(1),
      spawnCheckoutWorker(2),
    ]);

    const statuses = [procResult1.status, procResult2.status];
    const successCount = statuses.filter((s) => s === 200).length;
    const rejectedCount = statuses.filter((s) => s >= 400).length;

    // Fail-safe requirement: If RPC succeeds, exactly 1 succeeds. If RPC is unavailable/blocked, both fail safely.
    // In both cases, stock must NEVER become negative and never mutate on RPC failure.
    if (successCount === 1) {
      assert(rejectedCount === 1, "Concurrency", `Second concurrent process blocked with 400 Insufficient Stock`);
      const refreshedProds = JSON.parse(fs.readFileSync(customProdsPath, "utf-8"));
      const endStock = refreshedProds.find((p) => p.id === testProd.id)?.stock_quantity;
      assert(endStock === 0, "Concurrency", `Inventory decremented cleanly to exactly 0 (Never negative: ${endStock})`);
    } else {
      assert(rejectedCount === 2, "Concurrency", `Both concurrent processes failed safely when RPC is unavailable (Got ${rejectedCount} rejections)`);
      const refreshedProds = JSON.parse(fs.readFileSync(customProdsPath, "utf-8"));
      const endStock = refreshedProds.find((p) => p.id === testProd.id)?.stock_quantity;
      assert(endStock === 1, "Concurrency", `Stock remained untouched safely without local mutation (Stock: ${endStock})`);
    }

    // Restore stock
    testProd.stock_quantity = originalStock;
    fs.writeFileSync(customProdsPath, JSON.stringify(customProds, null, 2), "utf-8");
  } catch (err) {
    console.error("Concurrency test error:", err);
    failed++;
  }

  console.log("\n================================================================");
  console.log(`🏁 PRODUCTION HARDENING SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================\n");

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runHardeningSuite();
