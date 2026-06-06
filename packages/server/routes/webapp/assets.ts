import { createHash } from "node:crypto";

async function loadAssets(): Promise<{ setupJs: string; cssText: string }> {
  if (process.env.NODE_ENV !== "production") {
    const setupJsPath = new URL("../../src/client/setup.ts", import.meta.url)
      .pathname;
    const cssPath = new URL("../../src/client/styles.css", import.meta.url)
      .pathname;

    const setupBuild = await Bun.build({
      entrypoints: [setupJsPath],
      target: "browser",
      minify: false,
    });
    if (!setupBuild.success) {
      for (const log of setupBuild.logs) console.error("[webapp build]", log);
    }

    const cssBuild = await Bun.build({
      entrypoints: [cssPath],
      target: "browser",
      minify: false,
    });
    if (!cssBuild.success) {
      for (const log of cssBuild.logs) console.error("[webapp css build]", log);
    }

    return {
      setupJs: setupBuild.success
        ? await setupBuild.outputs[0].text()
        : `console.error("webapp/setup.js build failed")`,
      cssText: cssBuild.success
        ? await cssBuild.outputs[0].text()
        : await Bun.file(cssPath).text(),
    };
  }

  // Production: load assets pre-built at deploy time into dist/client/
  // (import.meta.url resolves to whichever dist chunk contains this code,
  // so ./client/ is always a sibling directory of that chunk)
  const setupJsPath = new URL("./client/setup.js", import.meta.url).pathname;
  const cssPath = new URL("./client/styles.css", import.meta.url).pathname;
  return {
    setupJs: await Bun.file(setupJsPath).text(),
    cssText: await Bun.file(cssPath).text(),
  };
}

const { setupJs, cssText } = await loadAssets();

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
