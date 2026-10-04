/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  async rewrites() {
    return [{ source: '/market', destination: '/market.html' }]
  },
}

module.exports = nextConfig
