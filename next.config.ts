import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/features/reminders",
        destination: "/features/scheduled-tasks",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
