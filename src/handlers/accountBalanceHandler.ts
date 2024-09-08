import { HandlerContext } from "@xmtp/message-kit";
import { getAccountBalance } from "../lib/balance.js";
import { sendWaitMessage } from "../utils/waitMessage.js";

export async function handleAccountBalance(context: HandlerContext, address: string): Promise<{ message: string; showMenu: boolean }> {
  const waitMessageTimer = await sendWaitMessage(context);

  try {
    const balanceInfo = await getAccountBalance(address);
    clearTimeout(waitMessageTimer);
    return { message: balanceInfo, showMenu: true };
  } catch (error) {
    console.error('Error fetching account balance:', error);
    clearTimeout(waitMessageTimer);
    return { message: "Sorry, there was an error fetching your account balance. Please try again later.", showMenu: true };
  }
}