import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Proxy requests to Flask backend during development
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:5000/api/:path*",
      },
      // Proxy images referenced in markdown content (stored in Flask's markdownResult/)
      {
        source: "/images/:path*",
        destination: "http://localhost:5000/api/images/:path*",
      },
    ]
  },
}

export default nextConfig
