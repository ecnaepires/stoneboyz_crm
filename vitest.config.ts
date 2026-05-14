export default {
  test: {
    exclude: ['**/node_modules/**', '**/dist/**'],
    fileParallelism: false,
    pool: 'threads'
  }
};
