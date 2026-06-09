import { stdin, stdout } from "node:process";
import * as readline from "node:readline/promises";
import * as dotenv from "dotenv";
import { Agent } from "./agent";
import type { AgentEvent } from "./event";
import { AgentSession } from "./session";

dotenv.config();

function renderCliEvent(event: AgentEvent): void {
  if (event.type === "assistant.message") {
    console.log(`[${event.type}] ${event.turnId}|${event.sequence} - ${event.text}`);
    return;
  } else if (event.type === "turn.failed") {
    console.log(`[${event.type}] ${event.turnId}|${event.sequence} - ${event.error}`);
    return;
  } else if (event.type === "tool.execution.started") {
    console.log(
      `[${event.type}] ${event.turnId}|${event.sequence} - Tool call ${event.callId} (${event.name}) with ${event.args}`,
    );
    return;
  } else if (event.type === "tool.execution.finished") {
    console.log(`[${event.type}] ${event.turnId}|${event.sequence} - Tool call ${event.callId} (${event.name})`);
    console.log(JSON.stringify(event.details));
    return;
  }

  console.log(`[${event.type}] ${event.turnId}|${event.sequence}`);
}

export async function mainLoop(): Promise<void> {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const agent = new Agent({ workspaceRoot: process.cwd() });
  const session = new AgentSession(agent);

  try {
    void (async () => {
      for await (const event of session.events()) {
        renderCliEvent(event);
      }
    })();
    while (true) {
      const userInput = await rl.question("> ");
      await session.dispatch({ type: "user_message", text: userInput });
    }
  } finally {
    rl.close();
  }
}

mainLoop().catch(console.error);
