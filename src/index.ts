import "dotenv/config";

import { get_jira_issues_last_week } from "./client/jira.client";
import { generate_jira_report } from "./reports/generateJiraReport";
import { send_slack_message } from "./client/slack.client";
import { get_bitbucket_prs_last_week } from "./client/bitbucket.client";
import { generate_bitbucket_report } from "./reports/generateBitbucketReport";
async function main(): Promise<void> {
  const jira_response = await get_jira_issues_last_week();
  const bitbucket_response = await get_bitbucket_prs_last_week();
  const jira_report = generate_jira_report(jira_response);
  const bitbucket_report = generate_bitbucket_report(bitbucket_response);
  const full_report = [jira_report, "", "---", "", bitbucket_report].join("\n");
  await send_slack_message(full_report);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
