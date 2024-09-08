import { getRedisClient } from "./lib/redis.js";
import { run, HandlerContext } from "@xmtp/message-kit";
import { startCron } from "./lib/cron.js";
import { getAccountBalance } from "./lib/balance.js";
import {
  RedisClientType,
  RedisModules,
  RedisFunctions,
  RedisScripts,
} from "@redis/client";
import { getCryptoMarketSummary } from "./lib/getCryptoMarketSummary.js";

import { getWalletTransactionHistory } from './lib/transactionHistory.js';
import { ethers } from 'ethers';

//Tracks conversation steps
const inMemoryCacheStep = new Map<string, number>();

//List of words to stop or unsubscribe.
const stopWords = ["stop", "unsubscribe", "cancel", "list"];

const redisClient: RedisClientType<RedisModules, RedisFunctions, RedisScripts> =
  await getRedisClient();

let clientInitialized = false;
run(async (context: HandlerContext) => {
  const {
    v2client,
    message: {
      content: { content: text },
      typeId,
      sender,
    },
  } = context;

  if (!clientInitialized) {
    startCron(redisClient, v2client);
    clientInitialized = true;
  }
  if (typeId !== "text") {
    /* If the input is not text do nothing */
    return;
  }

  const lowerContent = text?.toLowerCase();

  //Handles unsubscribe and resets step
  if (stopWords.some((word) => lowerContent.includes(word))) {
    inMemoryCacheStep.set(sender.address, 0);
    await redisClient.del(sender.address);
    await context.reply(
      "You are now unsubscribed. You will no longer receive Current Market Sentiment.",
    );
    return;
  }

  const cacheStep = inMemoryCacheStep.get(sender.address) || 0;
  let message = "";
  if (cacheStep === 0) {
    message = "Welcome to OnChain.xyz! Choose an option:\n1. Current Market Sentiment\n2. Subscribe to daily Market Sentiment\n3. Get account balance\n4. Check wallet transaction history";
    inMemoryCacheStep.set(sender.address, cacheStep + 1);
  } else if (cacheStep === 1) {
    if (text === "1") {
      const marketSummary = await getCryptoMarketSummary();
      message = marketSummary;
      inMemoryCacheStep.set(sender.address, 0);
    } else if (text === "2") {
      await redisClient.set(sender.address, "subscribed");
      message = "You are now subscribed to daily BTC price updates.\n\nType 'stop' to unsubscribe";
      inMemoryCacheStep.set(sender.address, 0);
    } else if (text === "3") {
      const balanceInfo = await getAccountBalance(sender.address);
      message = balanceInfo;
      inMemoryCacheStep.set(sender.address, 0);
    } else if (text === '4') {
      message = "Please enter the wallet address you'd like to check:";
      inMemoryCacheStep.set(sender.address, 2);
    } else {
      message = "Invalid option. Please choose 1 for Crypto market summary, 2 to subscribe to updates, 3 to get account balance, or 4 to check wallet transaction history.";
    }
  } else if (cacheStep === 2) {
    if (ethers.utils.isAddress(text)) {
      message = "Select the blockchain:\n1. Ethereum\n2. Polygon\n3. Binance Smart Chain";
      await redisClient.set(`${sender.address}:wallet`, text);
      inMemoryCacheStep.set(sender.address, 3);
    } else {
      message = "Invalid Ethereum address. Please try again with a valid address.";
      // Keep the same step to allow for re-entry
    }
  } else if (cacheStep === 3) {
    let chain;
    switch(text) {
      case '1':
        chain = 'ethereum';
        break;
      case '2':
        chain = 'polygon';
        break;
      case '3':
        chain = 'bsc';
        break;
      default:
        message = "Invalid option. Please select 1 for Ethereum, 2 for Polygon, or 3 for Binance Smart Chain.";
        return await context.reply(message);
    }
    const wallet = await redisClient.get(`${sender.address}:wallet`);
    if (wallet) {
      message = await getWalletTransactionHistory(wallet, chain);
      await redisClient.del(`${sender.address}:wallet`);
    } else {
      message = "Error: Wallet address not found. Please start over.";
    }
    inMemoryCacheStep.set(sender.address, 0);
  } else {
    message = "Invalid option. Please start again.";
    inMemoryCacheStep.set(sender.address, 0);
  }

  //Send the message
  await context.reply(message);
});