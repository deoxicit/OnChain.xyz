import { createClient, RedisClientType } from "@redis/client";

export type GenericRedisClient = RedisClientType<any, any, any>;

export async function getRedisClient(): Promise<GenericRedisClient> {
  const client = createClient({
    url: process.env.REDIS_CONNECTION_STRING,
  }) as GenericRedisClient;

  client.on("error", (err) => {
    console.error("Redis client error:", err);
  });

  await client.connect();
  return client;
}