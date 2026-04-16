/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prevent Next.js from trying to bundle server-only CJS packages like nodemailer
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "nodemailer"];
    }
    return config;
  },
};

module.exports = nextConfig;
