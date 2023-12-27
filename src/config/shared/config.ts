interface ISharedConfig {
  app: {
    landscape: string;
    platform: string;
    service: string;
    module: string;
    version: string;
  };
  errorPortal: {
    enabled: boolean;
    scheme: "http" | "https";
    host: string;
  };
  api: {
    domain: string;
    scheme: string;
  };
}

export type { ISharedConfig };
