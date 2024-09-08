import { HandlerContext } from "@xmtp/message-kit";
import { RedisClientType } from "@redis/client";
import { ethers } from 'ethers';
import { getWalletTransactionHistory } from '../lib/transactionHistory.js';
import { sendWaitMessage } from "../utils/waitMessage.js";

export async function handleTransactionHistory(
  context: HandlerContext,
  redisClient: RedisClientType,
  address: string,
  input: string
): Promise<{ message: string; showMenu: boolean }> {
  if (input === "start") {
    await redisClient.set(`${address}:step`, "2");
    return { message: "Please enter the wallet address you'd like to check:", showMenu: false };
  }

  const step = await redisClient.get(`${address}:step`);

  if (step === "2") {
    if (ethers.utils.isAddress(input)) {
      await redisClient.set(`${address}:wallet`, input);
      await redisClient.set(`${address}:step`, "3");
      return { message: "Select the blockchain:\n1. Ethereum\n2. Polygon\n3. Binance Smart Chain", showMenu: false };
    } else {
      return { message: "Invalid Ethereum address. Please try again with a valid address.", showMenu: false };
    }
  } else if (step === "3") {
    let chain;
    switch (input) {
      case '1': chain = 'ethereum'; break;
      case '2': chain = 'polygon'; break;
      case '3': chain = 'bsc'; break;
      default: return { message: "Invalid option. Please select 1 for Ethereum, 2 for Polygon, or 3 for Binance Smart Chain.", showMenu: false };
    }

    const wallet = await redisClient.get(`${address}:wallet`);
    if (wallet) {
      const waitMessageTimer = await sendWaitMessage(context);
      try {
        const history = await getWalletTransactionHistory(wallet, chain);
        clearTimeout(waitMessageTimer);
        await redisClient.del(`${address}:wallet`);
        await redisClient.set(`${address}:step`, "0");
        return { message: history, showMenu: true };
      } catch (error) {
        console.error('Error fetching transaction history:', error);
        clearTimeout(waitMessageTimer);
        await redisClient.del(`${address}:wallet`);
        await redisClient.set(`${address}:step`, "0");
        return { message: "Sorry, there was an error fetching the transaction history. Please try again later.", showMenu: true };
      }
    } else {
      await redisClient.set(`${address}:step`, "0");
      return { message: "Error: Wallet address not found. Please start over.", showMenu: true };
    }
  }

  await redisClient.set(`${address}:step`, "0");
  return { message: "An error occurred. Please try again.", showMenu: true };
}