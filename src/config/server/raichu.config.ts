import type { IServerConfig } from "./config";
import { DESCOPE_ID, DESCOPE_SECRET, AUTH_SECRET } from "$env/static/private";

const config: IServerConfig = {
  auth: {
    clientId: DESCOPE_ID,
    clientSecret: DESCOPE_SECRET,
    secret: AUTH_SECRET,
  },
};

export default config;
