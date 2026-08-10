import {
  type BitbucketPullRequest,
  type BitbucketSearchResponse,
} from "../types/BitbucketResponse";

export async function get_bitbucket_prs_last_week(): Promise<BitbucketPullRequest[]> {
  const workspace = process.env.BITBUCKET_WORKSPACE;
  const repo_slug = process.env.BITBUCKET_REPO_SLUG;
  const email = process.env.BITBUCKET_EMAIL;
  const api_token = process.env.BITBUCKET_API_TOKEN;

  if (!workspace || !repo_slug || !email || !api_token) {
    throw new Error(
      "Missing BITBUCKET_WORKSPACE, BITBUCKET_REPO_SLUG, BITBUCKET_EMAIL, or BITBUCKET_API_TOKEN",
    );
  }

  const credentials = Buffer.from(`${email}:${api_token}`).toString("base64");
  const seven_days_ago = new Date();
  seven_days_ago.setDate(seven_days_ago.getDate() - 7);

  const all_prs: BitbucketPullRequest[] = [];
  let url: string | undefined =
    `https://api.bitbucket.org/2.0/repositories/${workspace}/${repo_slug}/pullrequests` +
    `?state=MERGED&sort=-updated_on&pagelen=50`;
    console.warn(url)

  while (url) {
    const response: Response = await fetch(url, {
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Authorization: `Basic ${credentials}`,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Bitbucket API failed: ${response.status} ${await response.text()}`,
      );
    }

    const data = (await response.json()) as BitbucketSearchResponse;
    all_prs.push(...data.values);

    const oldest_in_page = new Date(
      data.values[data.values.length - 1]?.updated_on ?? 0,
    );
    if (!data.next || oldest_in_page < seven_days_ago) {
      break;
    }

    url = data.next;
  }

  return all_prs.filter((pr) => new Date(pr.updated_on) >= seven_days_ago);
}