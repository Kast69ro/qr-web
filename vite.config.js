import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Бэк не отдаёт CORS-заголовки, поэтому в dev браузер ходит на тот же
  // origin (`/pos/...`), а Vite проксирует запросы на тестовый сервер банка.
  // В проде так же: веб-сервер (nginx) отдаёт сборку и проксирует `/pos`.
  const target = env.API_PROXY_TARGET || 'http://10.64.20.101:8888';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: true,
      proxy: {
        '/pos': { target, changeOrigin: true },
      },
    },
    preview: {
      host: true,
      proxy: {
        '/pos': { target, changeOrigin: true },
      },
    },
  };
});
