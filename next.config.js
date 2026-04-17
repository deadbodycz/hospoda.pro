/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker / Vercel edge
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lvuenmvrcfogyqnixzyw.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

module.exports = nextConfig
