import { stdin, stdout } from "node:process";
import * as readline from "node:readline/promises";
import * as dotenv from "dotenv";
import { Agent } from "./agent";
import { AgentSession } from "./session";
import { AgentEvent } from "./event";
dotenv.config();

function renderCliEvent(event: AgentEvent): void {
  if (event.type === 'assistant.message') {
    console.log(`[${event.type}] ${event.text}`);
    return;
  }

  console.log(`[${event.type}]`);
}

export async function mainLoop(): Promise<void> {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const agent = new Agent({ workspaceRoot: process.cwd() });
  const session = new AgentSession(agent)

  try {
    void (async () => {
      for await (const event of session.events()) {
        renderCliEvent(event);
      }
    })()
    while (true) {
      const userInput = await rl.question("> ");
      await session.dispatch({type: "user_message", text: userInput});
    }
  } finally {
    rl.close();
  }
}

mainLoop().catch(console.error);
