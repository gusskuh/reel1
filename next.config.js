/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pipeline runs 2-5 min; API routes need longer timeout
  experimental: {
    serverComponentsExternalPackages: ["fluent-ffmpeg", "ffmpeg-static", "ffprobe-static"],
  },
};

module.exports = nextConfig;
