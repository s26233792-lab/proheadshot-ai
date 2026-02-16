/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    POSTGRES_URL: process.env.POSTGRES_URL,
  },
}

module.exports = nextConfig
