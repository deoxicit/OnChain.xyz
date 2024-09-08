import { run, HandlerContext } from "@xmtp/message-kit";
import { getRedisClient, GenericRedisClient } from "./lib/redis.js";
import { startCron } from "./lib/cron.js";
import { handleUserInput } from "./handlers/inputHandler.js";
import { sendDefaultMenu } from "./utils/menuUtils.js";

let redisClient: GenericRedisClient;
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
    redisClient = await getRedisClient();
    startCron(redisClient, v2client);
    clientInitialized = true;
  }

  if (typeId !== "text") {
    return;
  }

  const result = await handleUserInput(context, redisClient, text, sender.address);
  
  if (result.message) {
    await context.reply(result.message);
  }
  
  if (result.showMenu) {
    await sendDefaultMenu(context);
  }
});