/**
 * Drop local-only tooling from package.json before Docker npm install.
 * npm ci cannot run after this (lockfile would mismatch) — use npm install.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const DROP =
  /eslint|prettier|vitest|playwright|storybook|knip|lefthook|husky|commitlint|semantic-release|checkly|pglite|i18n-check|spotlight|bundle-analyzer|chromatic|lint-staged|npm-run-all|devtools|^rimraf$|^cross-env$|^dotenv-cli$/;

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const before = Object.keys(pkg.devDependencies || {}).length;
for (const name of Object.keys(pkg.devDependencies || {})) {
  if (DROP.test(name)) delete pkg.devDependencies[name];
}
delete pkg.scripts?.prepare;
writeFileSync('package.json', `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`docker-slim-package: devDependencies ${before} → ${Object.keys(pkg.devDependencies || {}).length}`);
