/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pipeline runs 2-5 min; API routes need longer timeout
  experimental: {
    serverComponentsExternalPackages: ["fluent-ffmpeg", "ffmpeg-static", "ffprobe-static"],
    // Vercel: bundle ffmpeg/ffprobe binaries into the /api/generate serverless output (fixes ENOENT).
    outputFileTracingIncludes: {
      "/api/generate": [
        "./node_modules/ffmpeg-static/**/*",
        "./node_modules/ffprobe-static/**/*",
      ],
    },
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/array/:path*",
        destination: "https://us-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  skipTrailingSlashRedirect: true,
};

module.exports = nextConfig;
