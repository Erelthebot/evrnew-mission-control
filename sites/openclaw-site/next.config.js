/** @type {import('next').NextConfig} */
const nextConfig = {
  // server mode — real-time API routes for live dashboard data
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
}

module.exports = nextConfig
