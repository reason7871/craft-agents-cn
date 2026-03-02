/**
 * Validate that required assets were copied to dist/.
 *
 * Run: bun scripts/validate-assets.ts
 */

import { existsSync } from 'fs';
import { join } from 'path';

const requiredAssets = [
  'dist/resources',
  'dist/resources/docs',
  'dist/resources/themes',
  'dist/skills/builtin',
];

let hasErrors = false;

for (const asset of requiredAssets) {
  if (!existsSync(asset)) {
    console.error(`✗ Missing required asset: ${asset}`);
    hasErrors = true;
  } else {
    console.log(`✓ Found: ${asset}`);
  }
}

if (hasErrors) {
  console.error('Asset validation failed. Run `bun run build:copy` first.');
  process.exit(1);
}

console.log('All required assets validated successfully.');
