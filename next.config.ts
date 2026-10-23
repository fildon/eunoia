import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      // Single-user app writing straight to Supabase (no revalidatePath),
      // so a short client-cache window trades staleness for instant revisits.
      dynamic: 30,
      // Also applies to the nav's fully-prefetched pages (prefetch={true});
      // kept short so an edit made on another device shows up soon.
      static: 60,
    },
  },
};

export default nextConfig;
