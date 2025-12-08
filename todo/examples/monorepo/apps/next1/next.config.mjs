/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This is to ensure that changes in the linked local packages (lib1)
  // trigger a rebuild of the Next.js application.
  transpilePackages: ['lib1'],
};

export default nextConfig;
