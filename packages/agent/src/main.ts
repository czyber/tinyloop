import { stdin, stdout } from "node:process";
import * as readline from "node:readline/promises";
import * as dotenv from "dotenv";
import { Agent } from "./agent";
dotenv.config();

export async function mainLoop(): Promise<void> {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const agent = new Agent({ workspaceRoot: process.cwd() });

  try {
    while (true) {
      const userInput = await rl.question("> ");
      console.log(await agent.runOneUserTurn(userInput));
    }
  } finally {
    rl.close();
  }
}

mainLoop().catch(console.error);
