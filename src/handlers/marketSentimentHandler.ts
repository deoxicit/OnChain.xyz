import { HandlerContext } from "@xmtp/message-kit";
import { getCryptoMarketSummary } from "../lib/getCryptoMarketSummary.js";
import { sendWaitMessage } from "../utils/waitMessage.js";

export async function handleMarketSentiment(context: HandlerContext): Promise<{ message: string; showMenu: boolean }> {
  const waitMessageTimer = await sendWaitMessage(context);
  
  try {
    const marketSummary = await getCryptoMarketSummary();
    clearTimeout(waitMessageTimer);
    return { message: marketSummary, showMenu: true };
  } catch (error) {
    console.error('Error fetching market sentiment:', error);
    clearTimeout(waitMessageTimer);
    return { message: "Sorry, there was an error fetching the market sentiment. Please try again later.", showMenu: true };
  }
}