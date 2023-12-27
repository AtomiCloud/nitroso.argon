interface IAuthConfig {
  clientId: string;
  clientSecret: string;
  secret: string;
}

interface IServerConfig {
  auth: IAuthConfig;
}

export type { IAuthConfig, IServerConfig };
