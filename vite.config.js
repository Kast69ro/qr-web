import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = (env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '');

  // Только `npm run dev`: CORS API не пускает localhost, поэтому `/web/` идёт через Vite.
  const proxy = target
    ? {
        '/web/': {
          target,
          changeOrigin: true,
          secure: true,
          // Бэк не должен видеть чужой Origin — запрос для него «серверный».
          configure: (p) => p.on('proxyReq', (req) => req.removeHeader('origin')),
        },
      }
    : undefined;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: true,
      proxy,
    },
    preview: {
      host: true,
    },
  };
});
