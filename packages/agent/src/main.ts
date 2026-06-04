import { stdin, stdout } from "node:process";
import * as readline from "node:readline/promises";
import * as dotenv from "dotenv";
import { createAgent, runOneUserTurn } from "./agent";

dotenv.config();

export async function mainLoop(): Promise<void> {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const agent = createAgent({ workspaceRoot: process.cwd() });

  try {
    while (true) {
      const userInput = await rl.question("> ");
      console.log(await runOneUserTurn(agent, userInput));
    }
  } finally {
    rl.close();
  }
}

mainLoop().catch(console.error);
