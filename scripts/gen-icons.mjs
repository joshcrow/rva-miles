// Renders the RVA Miles app icon to real PNGs in public/icons.
//
// Motif: a stylized winding road with a dashed centre line running from an
// origin marker up to a location pin, in white on the violet -> fuchsia brand
// gradient. All art sits inside the maskable safe zone (centre 80% circle),
// so the same drawing survives Android's adaptive-icon crop and iOS's squircle.
//
// Run: node scripts/gen-icons.mjs

import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire("/opt/node22/lib/node_modules/");
const { chromium } = require("playwright");

const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "icons",
);

const VIOLET = "#7C3AED";
const FUCHSIA = "#D946EF";

/** @param {{ radius: number }} opts */
function iconSvg({ radius }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="RVA Miles">
  <defs>
    <linearGradient id="brand" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="512" y2="512">
      <stop offset="0" stop-color="${VIOLET}"/>
      <stop offset="1" stop-color="${FUCHSIA}"/>
    </linearGradient>
    <radialGradient id="sheen" cx="0.18" cy="0.1" r="0.8">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.13"/>
      <stop offset="0.6" stop-color="#FFFFFF" stop-opacity="0.02"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignette" cx="0.86" cy="0.92" r="0.85">
      <stop offset="0" stop-color="#2A0A45" stop-opacity="0.20"/>
      <stop offset="1" stop-color="#2A0A45" stop-opacity="0"/>
    </radialGradient>
    <filter id="lift" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#2A0A45" flood-opacity="0.30"/>
    </filter>
  </defs>

  <rect x="0" y="0" width="512" height="512" rx="${radius}" fill="url(#brand)"/>
  <rect x="0" y="0" width="512" height="512" rx="${radius}" fill="url(#vignette)"/>
  <rect x="0" y="0" width="512" height="512" rx="${radius}" fill="url(#sheen)"/>

  <g transform="translate(256 256) scale(0.86) translate(-256 -256)" filter="url(#lift)">
    <path d="M172 392 C172 324 238 330 250 278 C262 226 306 216 330 206"
          fill="none" stroke="#FFFFFF" stroke-width="42"
          stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M172 392 C172 324 238 330 250 278 C262 226 306 216 330 206"
          fill="none" stroke="url(#brand)" stroke-width="8"
          stroke-dasharray="15 25" stroke-dashoffset="-46" opacity="0.9"/>
    <circle cx="172" cy="392" r="30" fill="#FFFFFF"/>
    <circle cx="172" cy="392" r="11.5" fill="url(#brand)"/>
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"
          transform="translate(255.6 59.6) scale(6.2)" fill="#FFFFFF"/>
  </g>
</svg>`;
}

const TARGETS = [
  { file: "icon-512.png", size: 512, radius: 112 },
  { file: "icon-192.png", size: 192, radius: 112 },
  // Maskable + apple-touch must be full bleed: the platform applies its own
  // mask, and pre-rounded corners would leave transparent notches.
  { file: "icon-512-maskable.png", size: 512, radius: 0 },
  { file: "icon-192-maskable.png", size: 192, radius: 0 },
  { file: "icon-180.png", size: 180, radius: 0 },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage({ deviceScaleFactor: 1 });

    for (const { file, size, radius } of TARGETS) {
      await page.setViewportSize({ width: size, height: size });
      await page.setContent(
        `<!doctype html><html><head><meta charset="utf-8"><style>
           html,body{margin:0;padding:0;background:transparent}
           svg{display:block;width:${size}px;height:${size}px}
         </style></head><body>${iconSvg({ radius })}</body></html>`,
        { waitUntil: "load" },
      );
      const buf = await page.screenshot({
        clip: { x: 0, y: 0, width: size, height: size },
        omitBackground: false,
        type: "png",
      });
      await writeFile(path.join(OUT_DIR, file), buf);
      console.log(`wrote ${file} (${size}x${size}, ${buf.length} bytes)`);
    }

    // Keep the source of truth next to the PNGs so the icon can be re-cut.
    await writeFile(path.join(OUT_DIR, "icon.svg"), iconSvg({ radius: 112 }));
    console.log("wrote icon.svg");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
