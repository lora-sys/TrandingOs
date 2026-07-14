#!/usr/bin/env node
/**
 * Bundle size check — fail if the main bundle exceeds the configured limit.
 * Run from apps/web after `npm run build`.
 *
 * Usage: node ../../scripts/check-bundle-size.mjs
 */
import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const LIMIT_KB = Number(process.env.BUNDLE_SIZE_LIMIT_KB ?? 2500);
const DIST_DIR = resolve(process.cwd(), "dist/assets");
const MAIN_PREFIX = "index-";

let largest = 0;
let largestName = "";
for (const file of readdirSync(DIST_DIR)) {
  if (!file.startsWith(MAIN_PREFIX) || !file.endsWith(".js")) continue;
  const sizeKb = statSync(join(DIST_DIR, file)).size / 1024;
  if (sizeKb > largest) {
    largest = sizeKb;
    largestName = file;
  }
}

console.log(`Main bundle: ${largestName} = ${largest.toFixed(1)} KB (limit: ${LIMIT_KB} KB)`);
if (largest > LIMIT_KB) {
  console.error(`Bundle size exceeded: ${largest.toFixed(1)} KB > ${LIMIT_KB} KB`);
  process.exit(1);
}
