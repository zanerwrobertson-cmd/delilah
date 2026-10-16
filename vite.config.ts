// Vite build/dev-server config. Docs: https://vitejs.dev/config/
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  server: {
    // "::" listens on all network interfaces, so phones on the same Wi-Fi can open the dev site.
    host: "::",
    port: 8080,
    hmr: {
      // Don't cover the page with a full-screen error overlay; errors still show in the console.
      overlay: false,
    },
  },
  // React support, compiled with SWC (faster than Babel).
  plugins: [react()],
  resolve: {
    alias: {
      // Lets imports use "@/components/..." instead of long "../../" relative paths.
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
