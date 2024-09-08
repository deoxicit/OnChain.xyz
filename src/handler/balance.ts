import { HandlerContext } from "@xmtp/message-kit";
import { getAccountBalance } from "../lib/balance.js";

export async function handler(context: HandlerContext): Promise<void> {
  const { sender } = context.message;
  const balanceInfo = await getAccountBalance(sender.address);
  await context.reply(balanceInfo);
}