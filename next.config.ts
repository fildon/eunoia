import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      // Single-user app writing straight to Supabase (no revalidatePath),
      // so a short client-cache window trades staleness for instant revisits.
      dynamic: 30,
    },
  },
};

export default nextConfig;
