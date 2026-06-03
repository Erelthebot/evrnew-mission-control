/** @type {import('next').NextConfig} */
const nextConfig = {
  // server mode — real-time API routes for live dashboard data
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  async redirects() {
    return [
      { source: '/team', destination: '/operations', permanent: false },
      { source: '/team/:path*', destination: '/operations', permanent: false },
      { source: '/office', destination: '/operations', permanent: false },
      { source: '/office/:path*', destination: '/operations', permanent: false },
    ]
  },
}

module.exports = nextConfig
