import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 }
});

await page.goto("https://cp-splash-nine.vercel.app/sports", {
  waitUntil: "networkidle",
  timeout: 30000
});

await page.waitForTimeout(2000);

const engine = page.getByText("COMMERCIAL ACQUISITION ENGINE").first();

console.log("=== SALES ENGINE VISUAL GEOMETRY ===");

console.log("Visible:", await engine.isVisible());

const box = await engine.boundingBox();

console.log("Bounding box:", box);

if (box) {
  console.log("Top:", box.y);
  console.log("Left:", box.x);
  console.log("Width:", box.width);
  console.log("Height:", box.height);
  console.log("Within initial viewport:", box.y < 900 ? "YES" : "NO");
}

console.log("\n=== PAGE DIMENSIONS ===");

console.log(
  "Viewport:",
  await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight
  }))
);

console.log(
  "Document:",
  await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight
  }))
);

console.log("\n=== SALES ENGINE ELEMENT ===");

console.log(
  await engine.evaluate(el => ({
    tag: el.tagName,
    text: el.textContent?.trim(),
    className: el.className
  }))
);

await engine.scrollIntoViewIfNeeded();

console.log("\n=== AFTER SCROLL ===");

console.log("Visible:", await engine.isVisible());
console.log("Bounding box:", await engine.boundingBox());

await page.screenshot({
  path: "sales-engine-production.png",
  fullPage: true
});

console.log("\nScreenshot: sales-engine-production.png");

await browser.close();
