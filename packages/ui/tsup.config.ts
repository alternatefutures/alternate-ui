import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2022',
  // React + the styling/radix deps are resolved by the consumer (peers/deps),
  // not bundled. tsup externalizes package.json deps/peers automatically; react
  // is listed explicitly for clarity.
  external: ['react', 'react-dom'],
  // tsup bundles all components into one module, dropping per-file directives.
  // Re-assert it so Next.js App Router treats the package as a client module.
  banner: { js: '"use client";' },
})
