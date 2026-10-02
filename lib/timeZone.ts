import { cookies, headers } from "next/headers";
import { DEFAULT_TIME_ZONE, isValidTimeZone, TIME_ZONE_COOKIE, todayDateString } from "./date";

// The server runs in UTC, so anything that depends on "today" needs the
// user's zone. TimeZoneSync keeps the cookie in step with the device clock;
// Vercel's IP-based guess only covers requests before that cookie exists
// (it's unreliable when roaming, since mobile data often exits at home).
export async function getRequestTimeZone(): Promise<string> {
  const fromCookie = (await cookies()).get(TIME_ZONE_COOKIE)?.value;
  if (fromCookie && isValidTimeZone(fromCookie)) return fromCookie;

  const fromIp = (await headers()).get("x-vercel-ip-timezone");
  if (fromIp && isValidTimeZone(fromIp)) return fromIp;

  return DEFAULT_TIME_ZONE;
}

export async function getRequestToday(): Promise<string> {
  return todayDateString(await getRequestTimeZone());
}
