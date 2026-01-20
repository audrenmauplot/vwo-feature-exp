import type { APIRoute } from "astro";
import { init } from "vwo-fme-node-sdk";

// ✅ petit cache pour éviter de ré-initialiser à chaque requête (POC-friendly)
let vwoClientPromise: ReturnType<typeof init> | null = null;

function getVwoClient(options: { accountId: string; sdkKey: string }) {
  if (!vwoClientPromise) {
    vwoClientPromise = init(options);
  }
  return vwoClientPromise;
}

export const GET: APIRoute = async ({ url }) => {
  const accountId = 1182478;          // <-- your VWO Account ID (number)
  const sdkKey = "23cec73b0c23e2f3f6098cb68d4f1e2e";     // <-- your VWO SDK Key (string)
  const flagKey = url.searchParams.get("flagKey") ?? "landingContent";
  const userId = url.searchParams.get("userId") ?? "unique_user_id";

  try {
    const vwoClient = await getVwoClient({ accountId, sdkKey });

    const userContext = { id: userId };
    const flag = await vwoClient.getFlag(flagKey, userContext);

    const enabled = flag.isEnabled();

    // Variable individuelle (comme ton exemple)
    const titleVariation = flag.getVariable("title_variation", "Experience Optimization Now");

    // Toutes les variables (objet ou liste selon SDK)
    const variables = flag.getVariables?.() ?? null;

    return new Response(
      JSON.stringify({
        flagKey,
        userId,
        enabled,
        title_variation: titleVariation,
        variables,
      }),
      { headers: { "content-type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: "VWO flag fetch failed",
        details: String(err?.message ?? err),
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
};