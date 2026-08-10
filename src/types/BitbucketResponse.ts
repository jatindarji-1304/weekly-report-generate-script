export interface BitbucketPullRequest {
  id: number;
  title: string;
  state: "OPEN" | "MERGED" | "DECLINED" | "SUPERSEDED";
  created_on: string;
  updated_on: string;
  author: {
    display_name: string;
    uuid: string;
  };
  links: {
    html: {
      href: string;
    };
  };
}

export interface BitbucketSearchResponse {
  values: BitbucketPullRequest[];
  next?: string;
}

export interface BitbucketDiffStat {
  values: {
    lines_added: number;
    lines_removed: number;
  }[];
}