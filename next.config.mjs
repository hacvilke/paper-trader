/** @type {import('next').NextConfig} */
const isExport = process.env.STATIC_EXPORT === "1";
const nextConfig = isExport
  ? {
      output: "export",
      distDir: ".next-export",
      basePath: "/paper-trader",
      allowedDevOrigins: ["*.e2b.app"],
    }
  : { allowedDevOrigins: ["*.e2b.app"] };
export default nextConfig;
