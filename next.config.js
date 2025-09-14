// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: false
  },
  images: {
    // usiamo solo immagini in /public (es. /logo-restart.png)
    remotePatterns: []
  }
};

module.exports = nextConfig;