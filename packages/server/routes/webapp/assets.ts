import { createHash } from "node:crypto";

const setupJsPath = new URL("../../src/client/setup.ts", import.meta.url)
  .pathname;
const cssPath = new URL("../../src/client/styles.css", import.meta.url)
  .pathname;

const setupBuild = await Bun.build({
  entrypoints: [setupJsPath],
  target: "browser",
  minify: process.env.NODE_ENV === "production",
});

if (!setupBuild.success) {
  for (const log of setupBuild.logs) console.error("[webapp build]", log);
}

const setupJs = setupBuild.success
  ? await setupBuild.outputs[0].text()
  : `console.error("webapp/setup.js build failed")`;

const cssBuild = await Bun.build({
  entrypoints: [cssPath],
  target: "browser",
  minify: process.env.NODE_ENV === "production",
});

if (!cssBuild.success) {
  for (const log of cssBuild.logs) console.error("[webapp css build]", log);
}

const cssText = cssBuild.success
  ? await cssBuild.outputs[0].text()
  : await Bun.file(cssPath).text();

const assetVersion = createHash("sha256")
  .update(cssText)
  .update(setupJs)
  .digest("hex")
  .slice(0, 8);

const ASSET_CACHE = "public, max-age=31536000, immutable";
const NO_CACHE = "no-store";

const assetCacheControl =
  process.env.NODE_ENV === "production" ? ASSET_CACHE : NO_CACHE;

export function jsAsset(): Response {
  return new Response(setupJs, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": assetCacheControl,
    },
  });
}

export function cssAsset(): Response {
  return new Response(cssText, {
    headers: {
      "Content-Type": "text/css; charset=utf-8",
      "Cache-Control": assetCacheControl,
    },
  });
}

export { assetVersion };
