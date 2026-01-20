import { init } from "vwo-fme-node-sdk";

const accountId = 1182478;          // <-- your VWO Account ID (number)
const sdkKey = "23cec73b0c23e2f3f6098cb68d4f1e2e";     // <-- your VWO SDK Key (string)
const flagKey = "landingContent";   // <-- your Feature Flag key

const userContext = {
  id: "demo_user_1",
  // customVariables: { plan: "pro" }, // optional targeting attributes
};

(async () => {
  console.log("Initializing VWO SDK...");
  const vwoClient = await init({
  accountId,
  sdkKey,
  pollInterval: 60000, // refresh settings periodically
  logger: { level: "debug" },
});

  console.log("Fetching flag:", flagKey);
  const flag = await vwoClient.getFlag(flagKey, userContext);

  console.log("✅ Result");
  console.log("flagKey:", flagKey);
  console.log("userId:", userContext.id);
  console.log("enabled:", flag.isEnabled());

  // Optional variable example:
  console.log("my_var:", flag.getVariable("my_var", "default"));

  process.exit(0);
})().catch((err) => {
  console.error("❌ VWO demo error:");
  console.error(err);
  process.exit(1);
});
