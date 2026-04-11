/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker / Vercel edge
  output: 'standalone',
  images: {
    remotePatterns: [],
  },
}

module.exports = nextConfig
