import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

export default defineConfig({
    plugins: [preact()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './setupTests.js',
        css: false,
        include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    },
});