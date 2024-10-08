import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"], // Entry points for your application
  format: ["cjs", "esm"], // Output formats: CommonJS and ES Modules
  bundle: true, // Enable bundling
  splitting: false, // Disable code splitting (or enable if you prefer)
  sourcemap: true, // Include source maps if you need them
  clean: true, // Clean the output folder before bundling
});
