import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import url from 'url'

function localApiPlugin(): Plugin {
  return {
    name: 'local-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        try {
          const parsedUrl = url.parse(req.url, true);
          const pathname = parsedUrl.pathname || '';
          req.query = parsedUrl.query;

          // Read body for POST / PATCH / PUT
          if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT') {
            const chunks: any[] = [];
            for await (const chunk of req) {
              chunks.push(chunk);
            }
            const bodyStr = Buffer.concat(chunks).toString('utf-8');
            try {
              req.body = bodyStr ? JSON.parse(bodyStr) : {};
            } catch {
              req.body = bodyStr;
            }
          }

          let handlerModule: any = null;

          if (pathname === '/api/orders' || pathname === '/api/orders/') {
            handlerModule = await server.ssrLoadModule('/api/orders/index.ts');
          } else if (pathname === '/api/orders/update-status') {
            handlerModule = await server.ssrLoadModule('/api/orders/update-status.ts');
          } else if (pathname === '/api/orders/manage') {
            handlerModule = await server.ssrLoadModule('/api/orders/manage.ts');
          } else if (pathname === '/api/orders/delivery') {
            handlerModule = await server.ssrLoadModule('/api/orders/delivery.ts');
          } else if (pathname === '/api/orders/tracking') {
            handlerModule = await server.ssrLoadModule('/api/orders/tracking.ts');
          } else if (pathname === '/api/cash-register') {
            handlerModule = await server.ssrLoadModule('/api/cash-register.ts');
          } else if (pathname === '/api/catalog') {
            handlerModule = await server.ssrLoadModule('/api/catalog.ts');
          } else if (pathname === '/api/auth/login') {
            handlerModule = await server.ssrLoadModule('/api/auth/login.ts');
          } else if (pathname === '/api/diagnostic') {
            handlerModule = await server.ssrLoadModule('/api/diagnostic.ts');
          } else if (pathname === '/api/settings' || pathname === '/api/settings/') {
            handlerModule = await server.ssrLoadModule('/api/settings/index.ts');
          }

          if (handlerModule && typeof handlerModule.default === 'function') {
            // Polyfill status / json / end on response
            res.status = (statusCode: number) => {
              res.statusCode = statusCode;
              return res;
            };
            res.json = (data: any) => {
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify(data));
              return res;
            };

            await handlerModule.default(req, res);
            return;
          }

          next();
        } catch (err: any) {
          console.error('[Vite Local API Error]:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ success: false, error: err?.message || 'Internal error' }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    localApiPlugin(),
  ],
})
