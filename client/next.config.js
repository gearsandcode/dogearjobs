/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    STRAPI_API_URL: process.env.STRAPI_API_URL || 'http://localhost:1337',
    STRAPI_API_TOKEN: process.env.STRAPI_API_TOKEN || '',
  }
}

module.exports = nextConfig