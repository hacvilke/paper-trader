/** @type {import('next').NextConfig} */
const isExport = process.env.STATIC_EXPORT === "1";
const nextConfig = isExport
  ? {
      output: "export",
      distDir: ".next-export",
      basePath: "/paper-trader",
      allowedDevOrigins: ["*.e2b.app"],
    }
  : {
      allowedDevOrigins: ["*.e2b.app"],
      async headers() {
        return [
          {
            source: "/:path*",
            headers: [
              { key: "X-Content-Type-Options", value: "nosniff" },
              { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
            ],
          },
        ];
      },
    };
export default nextConfig;
