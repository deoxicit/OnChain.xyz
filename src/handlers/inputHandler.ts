import { HandlerContext } from "@xmtp/message-kit";
import { GenericRedisClient } from "../lib/redis.js";
import { handleMarketSentiment } from "./marketSentimentHandler.js";
import { handleSubscription } from "./subscriptionHandler.js";
import { handleAccountBalance } from "./accountBalanceHandler.js";
import { handleTransactionHistory } from "./transactionHistoryHandler.js";
import { handlePortfolioAnalytics } from "./portfolioAnalyticsHandler.js";
import { handleGasPriceNotification } from "./gasNotificationHandler.js";
import { isStopWord } from "../utils/stopWords.js";
import { DEFAULT_MENU } from "../utils/menuUtils.js";

export async function handleUserInput(
  context: HandlerContext,
  redisClient: GenericRedisClient,
  text: string,
  address: string
): Promise<{ message?: string; showMenu: boolean }> {
  if (isStopWord(text)) {
    return handleSubscription(redisClient, address, true);
  }

  const cacheStep = await redisClient.get(`${address}:step`) || "0";
  const gasStep = await redisClient.get(`${address}:gas_step`) || "0";

  if (gasStep !== "0") {
    return handleGasPriceNotification(context, redisClient, address, text);
  }

  switch (cacheStep) {
    case "0":
      await redisClient.set(`${address}:step`, "1");
      return { message: DEFAULT_MENU, showMenu: false };
    case "1":
      switch (text) {
        case "1": return handleMarketSentiment(context);
        case "2": return handleSubscription(redisClient, address, false);
        case "3": return handleAccountBalance(context, address);
        case "4": return handleTransactionHistory(context, redisClient, address, "start");
        case "5": return handlePortfolioAnalytics(context, address);
        case "6": return handleGasPriceNotification(context, redisClient, address, "0");
        default: return { message: "Invalid option. Please choose a number between 1 and 6.", showMenu: true };
      }
    case "2":
    case "3":
      return handleTransactionHistory(context, redisClient, address, text);
    default:
      return { message: "An error occurred. Please try again.", showMenu: true };
  }
}