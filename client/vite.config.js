import { defineConfig } from 'vite'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  envDir: resolve(__dirname, '..'),
  plugins: [react()],
  resolve: {
    alias: {
      '@root/s3-storage': resolve(__dirname, '../s3-storage.js'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.js',
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 75,
        lines: 80,
      },
      exclude: [
        'scripts/**',
        'src/main.jsx',
        '**/node_modules/**',
        '**/*.test.{js,jsx,ts,tsx}',
        '**/vite.config.*',
        '**/eslint.config.*',
        '**/dist/**',
      ],
      reporter: [
        [resolve(__dirname, 'scripts/coverage-text-reporter.cjs'), { maxCols: 0 }],
        [resolve(__dirname, 'scripts/coverage-text-summary-reporter.cjs')],
        'html',
      ],
      outputDir: 'coverage',
    },
  },
  server: {
    port: parseInt(process.env.VITE_DEV_PORT, 10) || 5173,
    proxy: {
      '/api': `http://localhost:${parseInt(process.env.VITE_API_PORT, 10) || parseInt(process.env.EXPRESS_PORT, 10) || 3000}`,
      '/upload': `http://localhost:${parseInt(process.env.VITE_API_PORT, 10) || parseInt(process.env.EXPRESS_PORT, 10) || 3000}`,
      '/uploads': `http://localhost:${parseInt(process.env.VITE_API_PORT, 10) || parseInt(process.env.EXPRESS_PORT, 10) || 3000}`,
    },
  },
})
