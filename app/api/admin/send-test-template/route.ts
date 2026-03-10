import { NextRequest } from "next/server";
import { adminConvexFetch } from "../_lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  return adminConvexFetch("/admin/send-test-template", {
    templateName: body.templateName,
    variables: body.variables,
    adminPhone: body.adminPhone,
    mediaUrl: body.mediaUrl,
  });
}
