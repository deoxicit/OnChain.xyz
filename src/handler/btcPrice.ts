import { HandlerContext } from "@xmtp/message-kit";
import { fetchBitcoinPrice } from "../lib/price.js";

export async function handler(context: HandlerContext): Promise<void> {
  const price = await fetchBitcoinPrice();
  await context.reply(`The current Bitcoin price is $${price}`);
}