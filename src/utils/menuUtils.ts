import { HandlerContext } from "@xmtp/message-kit";

export const DEFAULT_MENU = `
Welcome to OnChain.xyz! Choose an option:
1. Current Market Sentiment
2. Subscribe to daily Market Sentiment
3. Get account balance
4. Check wallet transaction history
5. Get Portfolio Analytics
`;

export async function sendDefaultMenu(context: HandlerContext) {
  await context.reply(DEFAULT_MENU);
}