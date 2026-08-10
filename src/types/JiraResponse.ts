export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    created: string;
    resolutiondate: string | null;
    issuetype: {
      name: string;
    };
    status: {
      name: string;
      statusCategory: {
        key: string;
        name: string;
      };
    };
  };
}

export interface JiraSearchResponse {
  issues: JiraIssue[];
  isLast?: boolean;
  nextPageToken?: string;
}