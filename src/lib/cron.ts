import cron from "node-cron";
import { Client } from "@xmtp/xmtp-js";
import {
  RedisClientType,
  RedisModules,
  RedisFunctions,
  RedisScripts,
} from "@redis/client";
import { getCryptoMarketSummary } from "./getCryptoMarketSummary.js";

export async function startCron(
  redisClient: RedisClientType<RedisModules, RedisFunctions, RedisScripts>,
  v2client: Client,
) {
  console.log("Starting daily BTC price update cron");
  const conversations = await v2client.conversations.list();
  cron.schedule(
    "0 8 * * *", // Every day at 8:00 AM UTC
    async () => {
      const keys = await redisClient.keys("*");
      console.log(`Running daily task. ${keys.length} subscribers.`);
      const marketSummary = await getCryptoMarketSummary();
      for (const address of keys) {
        const subscriptionStatus = await redisClient.get(address);
        if (subscriptionStatus === "subscribed") {
          console.log(`Sending daily BTC price update to ${address}`);
          const targetConversation = conversations.find(
            (conv) => conv.peerAddress === address,
          );
          if (targetConversation)
            await targetConversation.send(`Good morning! Here's today's crypto market summary:\n\n${marketSummary}`);
        }
      }
    },
    {
      scheduled: true,
      timezone: "UTC",
    },
  );
}