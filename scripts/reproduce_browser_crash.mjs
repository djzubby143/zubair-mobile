import puppeteer from "puppeteer-core";
import fs from "fs";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browserExecutable = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;

console.log(`Using browser executable: ${browserExecutable}`);

async function testPage(browser, url) {
  console.log(`\n======================================================`);
  console.log(`Testing URL: ${url}`);
  console.log(`======================================================`);

  const page = await browser.newPage();
  const consoleLogs = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on("console", (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  page.on("pageerror", (err) => {
    pageErrors.push({ message: err.message, stack: err.stack });
  });

  page.on("requestfailed", (req) => {
    failedRequests.push({
      url: req.url(),
      failure: req.failure()?.errorText || "unknown",
      method: req.method(),
    });
  });

  try {
    const response = await page.goto(url, { waitUntil: "networkidle0", timeout: 20000 });
    console.log(`Navigation status: ${response?.status()}`);

    // Check DOM for "Application error"
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasAppError = bodyText.includes("Application error: a client-side exception has occurred");

    console.log(`Has Application Error banner: ${hasAppError ? "YES (CRASH REPRODUCED)" : "NO"}`);
    if (hasAppError) {
      console.log(`--- Body Preview ---`);
      console.log(bodyText.slice(0, 300));
    }

    if (pageErrors.length > 0) {
      console.log(`\n--- Page Errors (${pageErrors.length}) ---`);
      pageErrors.forEach((e, i) => {
        console.log(`[Error ${i + 1}] Message: ${e.message}`);
        console.log(`Stack trace:\n${e.stack}`);
      });
    }

    if (failedRequests.length > 0) {
      console.log(`\n--- Failed Network Requests (${failedRequests.length}) ---`);
      failedRequests.forEach((r, i) => {
        console.log(`[Req ${i + 1}] ${r.method} ${r.url} - Failure: ${r.failure}`);
      });
    }

    const errorConsoles = consoleLogs.filter((l) => l.type === "error");
    if (errorConsoles.length > 0) {
      console.log(`\n--- Console Errors (${errorConsoles.length}) ---`);
      errorConsoles.forEach((l, i) => {
        console.log(`[Console Err ${i + 1}] ${l.text}`);
      });
    }
  } catch (err) {
    console.error(`Error during page test: ${err.message}`);
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: browserExecutable,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    await testPage(browser, "http://localhost:3000/compatibility");
    await testPage(browser, "http://localhost:3000/admin/compatibility");
    await testPage(browser, "http://localhost:3000/admin/pricing");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
