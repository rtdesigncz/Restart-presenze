// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Usi solo immagini in /public (es. /logo-restart.png)
    remotePatterns: [],
  },
  // Evita che il build fallisca perché manca ESLint su Vercel
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Lasciamo i type error attivi (meglio così). Se ti serve bypassarli in prod, metti true.
  typescript: {
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;