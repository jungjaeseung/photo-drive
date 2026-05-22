import { handlers } from "@/auth";
import { getBasePath } from "@/lib/config";
import { NextRequest } from "next/server";

/**
 * Next.js basePath 배포 시 들어오는 pathname에서 /photos 가 빠질 수 있음.
 * Auth.js basePath(/photos/api/auth)와 맞추기 위해 요청 URL에 다시 붙임.
 */
function injectAppBasePath(req: NextRequest): NextRequest {
  const basePath = getBasePath();
  if (!basePath) return req;

  const url = new URL(req.url);
  if (url.pathname.startsWith(basePath)) return req;

  url.pathname = `${basePath}${url.pathname}`;
  return new NextRequest(url, req);
}

export async function GET(req: NextRequest) {
  return handlers.GET(injectAppBasePath(req));
}

export async function POST(req: NextRequest) {
  return handlers.POST(injectAppBasePath(req));
}
