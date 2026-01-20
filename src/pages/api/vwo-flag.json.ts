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

  let userId = headerUserId || queryUserId || cookieUserId || `uid_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const userIdSource = headerUserId ? "header" : queryUserId ? "query" : cookieUserId ? "cookie" : "generated";

  // Helpful debug log — remove or lower in production
  console.debug("vwo-flag: resolved userId", { userId, userIdSource, headerUserId, queryUserId, cookieUserId });

  // flagKey peut rester en query (simple) ou header aussi
  const flagKey = reqUrl.searchParams.get("flagKey") || "landingContent";

  const vwoClient = await getClient(accountId, sdkKey);
  const flag = await vwoClient.getFlag(flagKey, { id: userId });

  const enabled = flag.isEnabled();
  const titleVariation = flag.getVariable("title_variation", "Title Fallback");
  const variables = flag.getVariables?.() ?? [];

  return new Response(
    JSON.stringify({ flagKey, userId, userIdSource, enabled, title_variation: titleVariation, variables }),
    { headers: { "content-type": "application/json" } }
  );
};
