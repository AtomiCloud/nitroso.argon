import { json } from "@sveltejs/kit";
import { problems } from "../../../../errors/error_info";

export function GET() {
  return json([...problems.values()].map((x) => x.id));
}
