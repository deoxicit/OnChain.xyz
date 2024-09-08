import { HandlerContext } from "@xmtp/message-kit";
import { RedisClientType } from "@redis/client";
import { handleMarketSentiment } from "./marketSentimentHandler.js";
import { handleSubscription } from "./subscriptionHandler.js";
import { handleAccountBalance } from "./accountBalanceHandler.js";
import { handleTransactionHistory } from "./transactionHistoryHandler.js";
import { handlePortfolioAnalytics } from "./portfolioAnalyticsHandler.js";
import { isStopWord } from "../utils/stopWords.js";

export async function handleUserInput(
  context: HandlerContext,
  redisClient: RedisClientType,
  text: string,
  address: string
): Promise<{ message?: string; showMenu: boolean }> {
  if (isStopWord(text)) {
    return handleSubscription(redisClient, address, true);
  }

  const cacheStep = await redisClient.get(`${address}:step`) || "0";

  switch (cacheStep) {
    case "0":
      await redisClient.set(`${address}:step`, "1");
      return { showMenu: true };
    case "1":
      switch (text) {
        case "1": return handleMarketSentiment(context);
        case "2": return handleSubscription(redisClient, address, false);
        case "3": return handleAccountBalance(context, address);
        case "4": return handleTransactionHistory(context, redisClient, address, "start");
        case "5": return handlePortfolioAnalytics(context, address);
        default: return { message: "Invalid option. Please choose a number between 1 and 5.", showMenu: false };
      }
    case "2":
    case "3":
      return handleTransactionHistory(context, redisClient, address, text);
    default:
      return { message: "An error occurred. Please try again.", showMenu: true };
  }
}