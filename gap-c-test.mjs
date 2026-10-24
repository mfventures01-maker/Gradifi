import { chromium } from "playwright";

const url = "https://gradifi.vercel.app/verify/VRF-ABCDEF121234";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const consoleErrors = [];
page.on("console", msg => {
  if (msg.type() === "error") {
    consoleErrors.push(msg.text());
  }
});

const responses = [];
page.on("response", response => {
  const u = response.url();
  if (
    u.includes("/api/") ||
    u.includes("supabase") ||
    u.includes("public_verification")
  ) {
    responses.push({
      status: response.status(),
      url: u
    });
  }
});

await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });

await page.waitForTimeout(3000);

console.log("\n=== PAGE ===");
console.log("URL:", page.url());
console.log("TITLE:", await page.title());

console.log("\n=== BODY TEXT ===");
console.log((await page.locator("body").innerText()).slice(0, 12000));

console.log("\n=== NETWORK ===");
console.log(JSON.stringify(responses, null, 2));

console.log("\n=== CONSOLE ERRORS ===");
console.log(JSON.stringify(consoleErrors, null, 2));

await browser.close();
