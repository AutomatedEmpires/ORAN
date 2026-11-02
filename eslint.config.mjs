import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
export default defineConfig([
  ...nextVitals, ...nextTs,
  globalIgnores(['.next/**', '.local/**', 'coverage/**', 'playwright-report/**', 'test-results/**', 'src/modules/platform/db.generated.ts']),
  { files: ['src/modules/**/*.ts'], rules: {
    'no-restricted-imports': ['error', { patterns: [{ group: ['@/modules/*/*'], message: 'Import another module through its public index.' }] }],
  } },
]);
