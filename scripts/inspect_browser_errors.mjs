import puppeteer from "puppeteer-core";
import fs from "fs";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browserExecutable = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;

async function inspectError(url) {
  const browser = await puppeteer.launch({
    executablePath: browserExecutable,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  
  await page.evaluateOnNewDocument(() => {
    window.__errors = [];
    window.addEventListener("error", (e) => {
      window.__errors.push({
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        stack: e.error ? e.error.stack : null,
      });
    });
    window.addEventListener("unhandledrejection", (e) => {
      window.__errors.push({
        message: "Unhandled Rejection: " + (e.reason?.message || e.reason),
        stack: e.reason?.stack,
      });
    });
  });

  page.on("pageerror", (err) => {
    console.log(`\n[PAGEERROR] for ${url}:`);
    console.log(err.stack || err.message);
  });

  page.on("requestfailed", (req) => {
    console.log(`[REQUEST FAILED] ${req.method()} ${req.url()}: ${req.failure()?.errorText}`);
  });

  page.on("response", (res) => {
    if (res.status() >= 400) {
      console.log(`[HTTP ${res.status()}] ${res.request().method()} ${res.url()}`);
    }
  });

  await page.goto(url, { waitUntil: "load", timeout: 20000 });
  await new Promise((r) => setTimeout(r, 2000));

  const collectedErrors = await page.evaluate(() => window.__errors);
  console.log(`\nCollected errors count for ${url}: ${collectedErrors.length}`);
  collectedErrors.forEach((e, idx) => {
    console.log(`\n--- Collected Error ${idx + 1} ---`);
    console.log(`Message: ${e.message}`);
    console.log(`Source: ${e.filename}:${e.lineno}:${e.colno}`);
    console.log(`Stack:\n${e.stack}`);
  });

  await browser.close();
}

async function run() {
  await inspectError("http://localhost:3000/compatibility");
  await inspectError("http://localhost:3000/admin/pricing");
}

run().catch(console.error);
