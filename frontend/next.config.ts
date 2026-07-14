import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  output: "standalone",
  rewrites: async () => {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8080";
    return {
      beforeFiles: [
        {
          source: "/workflow-engine-api/:path*",
          destination: `${backendUrl}/workflow-engine-api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
