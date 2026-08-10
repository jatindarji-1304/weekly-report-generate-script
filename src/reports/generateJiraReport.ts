import { type JiraIssue } from "../types/JiraResponse";

export function generate_jira_report(issues: JiraIssue[]): string {
  const base_url = process.env.JIRA_BASE_URL;

  const week_of = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (issues.length === 0) {
    return `*Weekly Jira Report — ${week_of}*\n\nNo issues created this week.`;
  }

  const lines = issues.map((issue) => {
    const status = issue.fields.status.name;
    const type = issue.fields.issuetype.name;
    const resolved = issue.fields.resolutiondate
      ? ` (resolved ${new Date(issue.fields.resolutiondate).toLocaleDateString("en-US", { month: "short", day: "numeric" })})`
      : "";

    const issue_url = `${base_url}/browse/${issue.key}`;
    const key_link = `<${issue_url}|${issue.key}>`; // Slack link syntax

    return `• *${key_link}* [${type}] — ${issue.fields.summary}\n   Status: ${status}${resolved}`;
  });

  const status_counts: Record<string, number> = {};
  for (const issue of issues) {
    const status = issue.fields.status.name;
    status_counts[status] = (status_counts[status] || 0) + 1;
  }

  const status_summary = Object.entries(status_counts)
    .map(([status, count]) => `${status}: ${count}`)
    .join(" | ");

  return [
    `*Weekly Jira Report — ${week_of}*`,
    `${issues.length} issue(s) created this week — ${status_summary}`,
    "",
    ...lines,
  ].join("\n");
}