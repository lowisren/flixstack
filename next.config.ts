import type { NextConfig } from "next";

// Only Contentstack Studio (any region, *.contentstack.com) may frame the Studio
// canvas. Scoped to /canvas so the rest of the site keeps the default framing policy.
const studioCanvasHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'self' https://*.contentstack.com;" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/canvas", headers: studioCanvasHeaders },
      { source: "/canvas/:path*", headers: studioCanvasHeaders },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.contentstack.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.contentstack.io",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
