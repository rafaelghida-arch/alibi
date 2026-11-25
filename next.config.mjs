import path from 'path';
import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  webpack(config) {
    config.resolve.alias['@'] = path.join(dir, 'src');
    return config;
  },
};
export default nextConfig;
