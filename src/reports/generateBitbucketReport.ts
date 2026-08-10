import { type BitbucketPullRequest } from "../types/BitbucketResponse";

export function generate_bitbucket_report(prs: BitbucketPullRequest[]): string {
  const week_of = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (prs.length === 0) {
    return `*Weekly Bitbucket Report — ${week_of}*\n\nNo PRs merged this week.`;
  }

  const lines = prs.map((pr) => {
    const merged_on = new Date(pr.updated_on).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const created = new Date(pr.created_on).getTime();
    const merged = new Date(pr.updated_on).getTime();
    const turnaround_hours = Math.round(
      ((merged - created) / (1000 * 60 * 60)) * 10,
    ) / 10;

    const pr_link = `<${pr.links.html.href}|#${pr.id}>`;

    return (
      `• *${pr_link}* — ${pr.title}\n` +
      `   By ${pr.author.display_name} · merged ${merged_on} · ${turnaround_hours}h open`
    );
  });

  const avg_turnaround = Math.round(
    (prs.reduce((sum, pr) => {
      const created = new Date(pr.created_on).getTime();
      const merged = new Date(pr.updated_on).getTime();
      return sum + (merged - created) / (1000 * 60 * 60);
    }, 0) /
      prs.length) *
      10,
  ) / 10;

  return [
    `*Weekly Bitbucket Report — ${week_of}*`,
    `${prs.length} PR(s) merged — avg ${avg_turnaround}h from open to merge`,
    "",
    ...lines,
  ].join("\n");
}