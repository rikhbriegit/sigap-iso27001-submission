// Rebuild docs/SIGAP-Architecture.pdf and docs/architecture.png from docs/pdf/arch.html and docs/architecture.svg.
// Usage (from the repo root): npm i -D playwright && npx playwright install chromium && node docs/pdf/render-pdf.cjs
const path = require('path');
const url = require('url');
const { chromium } = require('playwright');
const docs = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
  const p = await b.newPage();
  await p.goto(url.pathToFileURL(path.join(__dirname, 'arch.html')).href);
  await p.waitForTimeout(500);
  await p.pdf({ path: process.env.PDF_OUT || path.join(docs, 'SIGAP-Architecture.pdf'), width: '13.333in', height: '7.5in', printBackground: true });
  const s = await b.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1 });
  await s.goto(url.pathToFileURL(path.join(docs, 'architecture.svg')).href);
  await s.locator('svg').screenshot({ path: process.env.PNG_OUT || path.join(docs, 'architecture.png') });
  await b.close();
  console.log('wrote SIGAP-Architecture.pdf and architecture.png');
})();
