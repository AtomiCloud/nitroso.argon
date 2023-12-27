import type { RequestHandler } from "@sveltejs/kit";
import { error, json } from "@sveltejs/kit";
import type { ErrorInfoResp } from "../../../../../errors/error_info";
import { problems } from "../../../../../errors/error_info";
import schemas from "./schema.json";

export const GET = (async ({ params }) => {
  if (params.slug == null) throw error(404, `Error '${params.slug}' not found`);
  const problem = [...problems.values()].find((x) => x.id === params.slug);
  if (problem == undefined)
    throw error(404, `Error '${params.slug}' not found`);

  // get relative
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const schema = schemas[problem.type.name];

  const errInfo = {
    id: problem.id,
    version: problem.version,
    schema: schema,
    title: problem.title,
  } satisfies ErrorInfoResp;
  return json(errInfo);
}) satisfies RequestHandler;
