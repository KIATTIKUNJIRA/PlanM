import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts'],
    // Extend Vitest's default exclude list to avoid executing published dependency test files
  exclude: [...configDefaults.exclude, 'tests-e2e/**', 'e2e/**'],
  },
});
