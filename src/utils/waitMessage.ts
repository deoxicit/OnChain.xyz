import { HandlerContext } from "@xmtp/message-kit";

export async function sendWaitMessage(context: HandlerContext, delay: number = 5000): Promise<NodeJS.Timeout> {
  return setTimeout(async () => {
    await context.reply("Please wait, I'm processing your request...");
  }, delay);
}