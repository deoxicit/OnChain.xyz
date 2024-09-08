import cron from "node-cron";
import { Client } from "@xmtp/xmtp-js";
import { GenericRedisClient } from "./redis.js";
import { getCryptoMarketSummary } from "./getCryptoMarketSummary.js";
import { fetchGasPrices } from "../handlers/fetchGasPrices.js";

export async function startCron(redisClient: GenericRedisClient, v2client: Client) {
  console.log("Starting daily BTC price update and gas price alert cron");
  const conversations = await v2client.conversations.list();

  cron.schedule("*/5 * * * *", async () => { // Every 5 minutes
    console.log("Running gas price check");
    const networks = ['1', '137']; 
    for (const network of networks) {
      try {
        const gasPrices = await fetchGasPrices(network);
        const keys = await redisClient.keys(`*:gas_alert:${network}`);
        for (const key of keys) {
          const [address] = key.split(':');
          const alertPriceStr = await redisClient.get(key);
          if (alertPriceStr === null) {
            console.log(`No alert price found for key: ${key}`);
            continue;
          }
          const alertPrice = parseInt(alertPriceStr);
          if (isNaN(alertPrice)) {
            console.log(`Invalid alert price for key: ${key}`);
            continue;
          }
          if (gasPrices.standard < alertPrice) {
            const conversation = conversations.find(conv => conv.peerAddress === address);
            if (conversation) {
              await conversation.send(`Alert: Gas price on network ${network} is now ${gasPrices.standard} Gwei, which is below your alert threshold of ${alertPrice} Gwei.`);
            }
          }
        }
      } catch (error) {
        console.error(`Error checking gas prices for network ${network}:`, error);
      }
    }
  });

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