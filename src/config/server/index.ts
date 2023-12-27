import { PUBLIC_LANDSCAPE } from "$env/static/public";
import type { IServerConfig } from "./config";
import lapras from "./lapras.config";
import pichu from "./pichu.config";
import pikachu from "./pikachu.config";
import raichu from "./raichu.config";

const reg: { [s: string]: IServerConfig } = {
  lapras,
  pichu,
  pikachu,
  raichu,
};

const config: IServerConfig = reg[PUBLIC_LANDSCAPE];
export { config };
