// src/commands.ts
import { CommandGroup, CommandConfig } from "@xmtp/message-kit";

const createCommand = (command: string, description: string): CommandConfig => ({
  command,
  description,
  params: {} // Empty object for commands without parameters
});

export const commands: CommandGroup[] = [
  {
    name: "Crypto",
    icon: "💰",
    description: "Crypto-related commands",
    commands: [
      createCommand("/btc", "Get the current Bitcoin price"),
      createCommand("/balance", "Get your account balance across supported chains"),
      createCommand("/help", "Show available commands"),
    ],
  },
];