import { run, HandlerContext, CommandHandlers } from "@xmtp/message-kit";
import { getRedisClient } from "./lib/redis.js";
import { startCron } from "./lib/cron.js";
import { handler as btcPriceHandler } from "./handler/btcPrice.js";
import { handler as balanceHandler } from "./handler/balance.js";
import { commands } from "./commands.js";

const redisClient = await getRedisClient();
startCron(redisClient);

const commandHandlers: CommandHandlers = {
  "/btc": btcPriceHandler,
  "/balance": balanceHandler,
  "/help": async (context: HandlerContext) => {
    const helpText = commands
      .flatMap((app) => app.commands)
      .map((command) => `${command.command} - ${command.description}`)
      .join("\n");
    await context.reply(`Available commands:\n${helpText}`);
  },
};

const appConfig = {
  commands: commands,
  commandHandlers: commandHandlers,
};

run(async (context: HandlerContext) => {
  const { typeId, content } = context.message;

  if (typeId === "text") {
    const text = content.content as string;
    if (text.startsWith("/")) {
      await context.intent(text);
    }
  }
}, appConfig);
