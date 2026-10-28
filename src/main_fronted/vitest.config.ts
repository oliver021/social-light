import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  (viteConfig as unknown as (env: { mode: string; command: 'serve' }) => object)({ mode: 'test', command: 'serve' }),
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
      restoreMocks: true,
      // MUI's ESM build imports react-transition-group directory paths that Node's
      // ESM resolver rejects, so let Vite transform both.
      server: { deps: { inline: [/@mui\//, /react-transition-group/] } },
    },
  }),
);
