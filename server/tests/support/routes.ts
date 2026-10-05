import type { Express } from "express";

// Every route registered on the app, found by walking Express's own router
// rather than from a list somebody has to remember to update. Shared by SEC-01
// (the route inventory) and API-87 (append-only comments and notes).
//
// It descends into routers and mounted sub-apps. A router, sub-app or handler
// mounted under a path prefix is reported as `unwalked` rather than skipped, so
// the day one is added the caller fails until the walker is taught the prefix -
// it can never pass by not seeing a route.

export type Route = { method: string; path: string };

type Layer = {
  route?: { path: string; methods: Record<string, boolean> };
  name?: string;
  regexp?: { fast_slash?: boolean };
  handle?: { stack?: Layer[]; _router?: { stack: Layer[] } };
};

export function routesOf(express: Express): { routes: Route[]; unwalked: string[] } {
  const routes: Route[] = [];
  const unwalked: string[] = [];
  const walk = (stack: Layer[]) => {
    for (const layer of stack) {
      if (layer.route) {
        for (const method of Object.keys(layer.route.methods)) {
          // router.all() registers "_all": probe it as a GET.
          routes.push({ method: method === "_all" ? "GET" : method.toUpperCase(), path: layer.route.path });
        }
        continue;
      }
      const nested = layer.handle?.stack ?? layer.handle?._router?.stack;
      if (!layer.regexp?.fast_slash) unwalked.push(`${layer.name ?? "handler"} mounted under a path prefix`);
      else if (nested) walk(nested);
    }
  };
  walk((express as unknown as { _router: { stack: Layer[] } })._router.stack);
  return { routes, unwalked };
}
