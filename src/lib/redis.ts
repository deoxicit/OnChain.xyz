import { createClient, RedisClientType } from "@redis/client";

export async function getRedisClient(): Promise<RedisClientType> {
  const client = createClient({
    url: process.env.REDIS_CONNECTION_STRING,
  });

  client.on("error", (err) => {
    console.error("Redis client error:", err);
  });

  await client.connect();
  return client;
}
