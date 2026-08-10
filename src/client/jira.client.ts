import { type JiraIssue, type JiraSearchResponse } from "../types/JiraResponse";

export async function get_jira_issues_last_week(): Promise<JiraIssue[]> {
  const base_url = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const api_token = process.env.JIRA_API_TOKEN;

  const jql = "assignee = currentUser() AND created >= -7d ORDER BY created DESC";

  const credentials = Buffer.from(`${email}:${api_token}`).toString("base64");

  const response = await fetch(`${base_url}/rest/api/3/search/jql`, {
    method: "POST",
    headers: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      Authorization: `Basic ${credentials}`,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jql,
      maxResults: 100,
      fields: ["summary", "created", "resolutiondate", "issuetype", "status"],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Jira API failed: ${response.status} ${await response.text()}`,
    );
  }

  const data = (await response.json()) as JiraSearchResponse;

  return data.issues;
}