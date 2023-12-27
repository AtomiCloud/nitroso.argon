import type { ISharedConfig } from "./config";

const config: ISharedConfig = {
  app: {
    landscape: "lapras",
    platform: "nitroso",
    service: "argon",
    module: "webapp",
    version: "1.0.0",
  },
  errorPortal: {
    enabled: true,
    host: "localhost:3000",
    scheme: "http",
  },
  api: {
    domain: "api.zinc.nitroso.lapras.lvh.me:20010",
    scheme: "http",
  },
};

export default config;
