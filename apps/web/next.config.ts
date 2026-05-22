import type { NextConfig } from "next";
import path from "node:path";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  basePath: basePath || undefined,
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: ["@photo-drive/shared"],
  serverExternalPackages: ["archiver"],
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
    // 미들웨어가 거치는 POST 등 대용량 본문 버퍼 한도(기본 10MB)
    middlewareClientMaxBodySize: "500mb",
  },
};

export default nextConfig;
