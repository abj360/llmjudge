#!/usr/bin/env node
/**
 * next.config.js --- Next.js configuration for the llmjudge dashboard
 *
 * Contains:
 *   API_ORIGIN: where browser calls to /api are forwarded
 *   nextConfig: strict mode and the API rewrite
 */

// Inside compose the API is another container, so localhost would be this one.
const API_ORIGIN = process.env.LLMJUDGE_API_URL || "http://localhost:8000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_ORIGIN}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
