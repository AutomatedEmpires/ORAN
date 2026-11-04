import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
export default defineConfig([
  ...nextVitals, ...nextTs,
  globalIgnores(['.next/**', '.next-test/**', '.local/**', '.claude/**', 'coverage/**', 'playwright-report/**', 'test-results/**', 'src/modules/platform/db.generated.ts']),
  { files: ['src/**/*.{ts,tsx}'], rules: {
    'no-restricted-imports': ['error', { patterns: [{ group: ['@/modules/*/*', '**/modules/*/*'], message: 'Import another module through its public index.' }] }],
  } },
]);
