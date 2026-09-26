import puppeteer from "puppeteer-core";
import fs from "fs";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function testBrowserLogin() {
  console.log("=== TESTING BROWSER ADMIN LOGIN WITH djzubby / 143143 ===");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    page.on("console", (msg) => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) {
        console.log(`[NAVIGATION] -> ${frame.url()}`);
      }
    });

    console.log("1. Navigating to http://localhost:3000/login...");
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle0" });

    console.log("2. Filling credentials in login card...");
    await page.waitForSelector("form input[placeholder*='alimobile']");
    await page.type("form input[placeholder*='alimobile']", "djzubby");
    await page.type("form input[type='password']", "143143");

    console.log("3. Submitting login form...");
    await page.click("form button[type='submit']");

    // Wait 4 seconds to observe navigation
    await new Promise((r) => setTimeout(r, 4000));

    const currentUrl = page.url();
    console.log("Current URL after login:", currentUrl);

    // If still on /login or redirected, check localStorage
    const storageUser = await page.evaluate(() => localStorage.getItem("zubair_customer_user"));
    console.log("LocalStorage zubair_customer_user:", storageUser);

    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasAdminPanel =
      bodyText.includes("Zubair Mobile Control Center") ||
      bodyText.includes("ERP Core v2.0 Active") ||
      bodyText.includes("SUPER ADMIN") ||
      bodyText.includes("Dj Zubby") ||
      bodyText.includes("Management");

    console.log("Contains Admin indicators:", hasAdminPanel);

    if (currentUrl.includes("/admin") && hasAdminPanel) {
      console.log("✅ BROWSER VERIFICATION PASSED: Successfully logged in as djzubby and loaded /admin dashboard!");
    } else {
      console.error("❌ BROWSER VERIFICATION FAILED. Body snippet:", bodyText.slice(0, 300));
      process.exit(1);
    }
  } finally {
    await browser.close();
  }
}

testBrowserLogin().catch((err) => {
  console.error("Browser login test error:", err);
  process.exit(1);
});
