import cron from "node-cron";
import { xmtpClient } from "@xmtp/message-kit";
import { RedisClientType } from "@redis/client";
import { fetchBitcoinPrice } from "./price.js";

export async function startCron(redisClient: RedisClientType): Promise<void> {
  const client = await xmtpClient();
  console.log("Starting daily BTC price update cron");
  
  cron.schedule("0 8 * * *", async () => {
    const keys = await redisClient.keys("*");
    console.log(`Running daily task. ${keys.length} subscribers.`);
    const price = await fetchBitcoinPrice();

    for (const address of keys) {
      const subscriptionStatus = await redisClient.get(address);
      if (subscriptionStatus === "subscribed") {
        console.log(`Sending daily BTC price update to ${address}`);
        const conversation = await client?.conversations.newConversation([address]);
        await conversation?.send(`Good morning! Today's Bitcoin price: $${price}`);
      }
    }
  }, {
    scheduled: true,
    timezone: "UTC",
  });
}