import "dotenv/config";
import { send_slack_message } from "./client/slack.client";

async function main(): Promise<void> {
  await send_slack_message("Hello from the weekly report automation! 👋");

  console.warn("Slack message sent successfully");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
