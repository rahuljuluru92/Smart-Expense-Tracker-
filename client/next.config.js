/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker builds set NEXT_OUTPUT=standalone; Vercel handles its own output.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  poweredByHeader: false,
  reactStrictMode: true,

  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: 'api.controlspending.com' },
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(self), microphone=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
