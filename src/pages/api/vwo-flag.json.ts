export const prerender = false;

import type { APIRoute } from "astro";
import { init } from "vwo-fme-node-sdk";

let clientPromise: ReturnType<typeof init> | null = null;

function getClient(accountId: string, sdkKey: string) {
  if (!clientPromise) clientPromise = init({ accountId, sdkKey });
  return clientPromise;
}

export const GET: APIRoute = async ({ request }) => {
  const accountId = "1182478";
  const sdkKey = "23cec73b0c23e2f3f6098cb68d4f1e2e";

  // Resolve userId from multiple sources: header -> query -> cookie -> fallback
  const reqUrl = new URL(request.url);
  const headerUserId = request.headers.get("x-vwo-user-id")?.trim() || null;
  const queryUserId = reqUrl.searchParams.get("userId") || reqUrl.searchParams.get("user_id") || null;
  const cookieHeader = request.headers.get("cookie") || "";
  function getCookie(name: string) {
    const pairs = cookieHeader.split(";").map((s) => s.trim());
    for (const p of pairs) {
      if (!p) continue;
      const [k, v] = p.split("=");
      if (k === name) return decodeURIComponent(v || "");
    }
    return null;
  }

  const cookieUserId = getCookie("vwo_user_id") || getCookie("userId") || null;

  // Custom variables depuis query (?cv=...json...)
  const cvRaw = reqUrl.searchParams.get("cv"); // ex: {"plan":"pro","country":"FR","age":32}
  let customVariables: Record<string, any> | undefined;
  try {
    customVariables = cvRaw ? JSON.parse(cvRaw) : undefined;
  } catch {
    customVariables = undefined;
  }

  // userAgent depuis le header
  const userAgent = request.headers.get("user-agent") || undefined;

  // ipAddress depuis proxy headers (POC-friendly)
  const xff = request.headers.get("x-forwarded-for") || "";
  const ipAddress = (xff.split(",")[0] || "").trim() || request.headers.get("x-real-ip") || undefined;

  const userId = headerUserId || queryUserId || cookieUserId || `uid_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const userIdSource = headerUserId ? "header" : queryUserId ? "query" : cookieUserId ? "cookie" : "generated";

  // Build context
  const userContext = {
    id: userId,
    customVariables,
    userAgent,
    ipAddress,
  };

  // Helpful debug log — remove or lower in production
  console.debug("vwo-flag: resolved userId", { userId, userIdSource, headerUserId, queryUserId, cookieUserId });

  // flagKey peut rester en query (simple) ou header aussi
  const flagKey = reqUrl.searchParams.get("flagKey") || "landingContent";
  const debug = reqUrl.searchParams.get("debug") === "1" || reqUrl.searchParams.get("debug") === "true";
  const headersObj: Record<string, string> = Object.fromEntries(Array.from(request.headers.entries()));
  const debugInfo = debug
    ? {
        headers: {
          has_x_vwo_user_id: !!headersObj["x-vwo-user-id"],
          x_vwo_user_id: headersObj["x-vwo-user-id"] || null,
          cookie_present: !!headersObj["cookie"],
          cookie_masked: headersObj["cookie"] ? "[REDACTED]" : null,
          allHeaderKeys: Object.keys(headersObj),
        },
      }
    : undefined;

  const vwoClient = await getClient(accountId, sdkKey);
  const flag = await vwoClient.getFlag(flagKey, userContext);

  const enabled = flag.isEnabled();
  const titleVariation = flag.getVariable("title_variation", "Title Fallback");
  const variables = flag.getVariables?.() ?? [];

  const payload: any = { flagKey, userId, userIdSource, enabled, title_variation: titleVariation, variables };
  if (debugInfo) payload.debug = debugInfo;

  const responseHeaders: Record<string, string> = {
    "content-type": "application/json",
    "cache-control": debug ? "no-store" : "public, max-age=0, must-revalidate",
  };

  // -------- 4) DEBUG: expose the context in the response
  return new Response(
    JSON.stringify({
      flagKey,
      enabled,
      title_variation: titleVariation,
      variables,

      // 👇 DEBUG ONLY — remove in prod
      debug: {
        userContext: {
          id: userContext.id,
          customVariables: userContext.customVariables,
          userAgent: userContext.userAgent ? "present" : null,
          ipAddress: userContext.ipAddress || null,
        },
      },
    }),
    { headers: { "content-type": "application/json" } }
  );
};
