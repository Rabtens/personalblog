import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // React Compiler disabled in dev for faster compilation
  // Enable in production with: reactCompiler: process.env.NODE_ENV === 'production'
  reactCompiler: false,
  turbopack: {
    root: __dirname,
    // Optimize turbopack for faster rebuilds
    resolveAlias: {},
  },
  // Performance optimizations
  swcMinify: true,
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  experimental: {
    optimizePackageImports: ['@tiptap/react', 'lucide-react'],
  },
};

export default nextConfig;
