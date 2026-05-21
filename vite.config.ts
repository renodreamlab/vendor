import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api/claude": {
          target: "https://api.openai.com",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/claude/, "/v1/chat/completions"),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.setHeader("Authorization", `Bearer ${env.OPENAI_API_KEY ?? ""}`);
            });
          },
        },
      },
    },
  };
});
