/**
 * Renders the SVG/HTML diagram sources (and PlantUML PNGs) to the JPGs in docs/diagrams.
 * Usage: NODE_PATH=<dir with playwright-core> node render_diagrams.js <input.svg|.html|.png> <output.jpg> [width]
 */
const path = require('path');
const { chromium } = require('playwright-core');
const [input, output, width] = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  try {
    const page = await browser.newPage({ viewport: { width: Number(width || 2400), height: 1200 }, deviceScaleFactor: 1.5 });
    const url = 'file://' + path.resolve(input);
    const fs = require('fs');
    if (/\.svg$/i.test(input)) await page.setContent(`<body style="margin:0">${fs.readFileSync(input, 'utf8')}</body>`);
    else if (/\.png$/i.test(input)) await page.setContent(`<body style="margin:0"><img src="data:image/png;base64,${fs.readFileSync(input).toString('base64')}"></body>`);
    else await page.goto(url);
    const target = /\.svg$/i.test(input) ? 'svg' : /\.png$/i.test(input) ? 'img' : 'body > main';
    await page.locator(target).first().screenshot({ path: output, type: 'jpeg', quality: 92 });
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
