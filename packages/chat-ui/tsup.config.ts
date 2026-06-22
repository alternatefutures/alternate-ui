import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2022',
  // react, lucide-react, and the @alternatefutures/* packages are resolved by the
  // consumer (peers/deps). tsup externalizes package.json deps/peers automatically.
  external: ['react', 'react-dom', 'lucide-react'],
  // Bundled into one module → re-assert the directive for Next.js App Router.
  banner: { js: '"use client";' },
})
