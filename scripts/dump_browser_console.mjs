import puppeteer from "puppeteer-core";
import fs from "fs";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function testWithDevLogs(url) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox"],
  });

  const page = await browser.newPage();
  
  page.on("console", (msg) => {
    console.log(`[BROWSER CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
    msg.args().forEach(async (arg, i) => {
      try {
        const val = await arg.jsonValue();
        if (typeof val === "object" && val !== null) {
          console.log(`  Arg ${i}:`, JSON.stringify(val, null, 2));
        }
      } catch {}
    });
  });

  page.on("pageerror", (err) => {
    console.log(`[PAGE ERROR]`, err.stack || err.message);
  });

  console.log(`Navigating to ${url}...`);
  await page.goto(url, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2000));

  await browser.close();
}

async function main() {
  console.log("=== CHECKING /compatibility ===");
  await testWithDevLogs("http://localhost:3000/compatibility");
  console.log("\n=== CHECKING /admin/pricing ===");
  await testWithDevLogs("http://localhost:3000/admin/pricing");
}

main().catch(console.error);
