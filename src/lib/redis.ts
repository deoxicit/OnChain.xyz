import { createClient, RedisClientType, RedisModules, RedisFunctions, RedisScripts } from "@redis/client";

export type GenericRedisClient = RedisClientType<RedisModules, RedisFunctions, RedisScripts>;

export async function getRedisClient(): Promise<GenericRedisClient> {
  const client = createClient({
    url: process.env.REDIS_CONNECTION_STRING,
  });

  client.on("error", (err) => {
    console.error("Redis client error:", err);
  });

  await client.connect();
  return client;
}