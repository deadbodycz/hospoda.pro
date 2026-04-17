/** @type {import('next').NextConfig} */
const supabaseHostname = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co').hostname

const nextConfig = {
  // Enable standalone output for Docker / Vercel edge
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: supabaseHostname,
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

module.exports = nextConfig
