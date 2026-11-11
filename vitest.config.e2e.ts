import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    env: {
      API_KEY: 'e2e-test-key',
      RAZORPAY_KEY_ID: 'rzp_test_dummy',
      RAZORPAY_KEY_SECRET: 'dummy-secret',
      RAZORPAY_WEBHOOK_SECRET: 'e2e-webhook-secret',
    },
  },
});
