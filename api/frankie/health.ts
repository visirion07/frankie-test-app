import { handleHealth } from "../../server/frankie.js";

export function GET() {
  return handleHealth(process.env);
}
