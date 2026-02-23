import { adminConvexFetch } from "../_lib/auth";

export async function POST() {
  return adminConvexFetch("/admin/template-status");
}
