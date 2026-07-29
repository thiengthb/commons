import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Vitest for a Next.js App Router app on this platform.
//
// `tsconfigPaths()` makes the `@/*` alias (tsconfig "paths") resolve in tests. The default environment
// is "node", which is what server actions and pure logic want; a component test opts into jsdom with a
// top-of-file docblock:  // @vitest-environment jsdom
//
// Deliberately WITHOUT @vitejs/plugin-react: Vite transforms TSX through esbuild on its own, and the
// plugin drags in a Babel tree that collides with the shadcn CLI's own Babel 7 pin — measured
// 2026-07-29 on a fresh scaffold, where plugin-react 6.0.4 wants @babel/core 8 and npm refuses to
// install at all. Add it, with jsdom and @testing-library/react, the day you write React component
// tests; until then it is a dependency conflict bought for nothing.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'dist'],
  },
});
