import { RedisClientType } from "@redis/client";

export async function handleSubscription(
  redisClient: RedisClientType,
  address: string,
  isUnsubscribe: boolean
): Promise<{ message: string; showMenu: boolean }> {
  if (isUnsubscribe) {
    await redisClient.del(address);
    await redisClient.set(`${address}:step`, "0");
    return { message: "You are now unsubscribed. You will no longer receive Current Market Sentiment.", showMenu: true };
  } else {
    await redisClient.set(address, "subscribed");
    return { message: "You are now subscribed to daily BTC price updates.\n\nType 'stop' to unsubscribe", showMenu: true };
  }
}