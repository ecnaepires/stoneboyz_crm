export default {
  test: {
    exclude: ['**/node_modules/**', '**/dist/**'],
    fileParallelism: false,
    pool: 'threads',
    setupFiles: ['./tests/integration/helpers/test-auth.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.spec.ts', '**/migrations/**'],
    },
  },
};
