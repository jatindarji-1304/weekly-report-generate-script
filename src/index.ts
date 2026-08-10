import "dotenv/config";

import { get_jira_issues_last_week } from "./client/jira.client";
import { generate_jira_report } from "./reports/generateJiraReport";
import { send_slack_message } from "./client/slack.client";
async function main(): Promise<void> {
  const issues = await get_jira_issues_last_week();
  const messgae = generate_jira_report(issues);
  await send_slack_message(messgae);
  console.warn(messgae);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
