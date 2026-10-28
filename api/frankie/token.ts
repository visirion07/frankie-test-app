import { handleToken } from "../../server/frankie.js";

export function POST(request: Request) {
  return handleToken(request, process.env);
}
