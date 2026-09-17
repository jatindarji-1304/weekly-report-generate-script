# Weekly Report Automation Script

An automated Node.js and TypeScript service that collects weekly developer activity from **Jira** and **Bitbucket**, processes performance and status metrics, and delivers a consolidated markdown report to a **Slack** channel for project managers and engineering teams.

---

## 1. Project Overview

The **Weekly Report Automation Script** streamlines engineering progress reporting. Instead of manually collating closed tickets, status updates, and merged pull requests at the end of each sprint or week, this script automates the entire aggregation pipeline.

It queries:
1. **Jira REST API v3**: Gathers issues assigned to the authenticated developer that were created within the last 7 days.
2. **Bitbucket REST API 2.0**: Gathers all pull requests merged in the configured repository over the last 7 days with paginated retrieval.

The script computes key metrics (issue status breakdowns, individual and average PR turnaround times), compiles a formatted Slack message using Slack's `mrkdwn` link format, and posts it to a designated Slack channel via an Incoming Webhook.

### Workflow Diagram

```text
               ┌───────────────────────┐
               │    GitHub Actions     │
               │   (Cron / Dispatch)   │
               │          or           │
               │     Manual Run        │
               └──────────┬────────────┘
                          │
                          ▼
            ┌───────────────────────────┐
            │   src/index.ts (Node.js)  │
            └──────┬─────────────┬──────┘
                   │             │
        Fetch Jira │             │ Fetch Merged PRs
        Issues     │             │ (Last 7 Days)
                   ▼             ▼
       ┌───────────────┐     ┌──────────────────┐
       │ Jira Cloud v3 │     │ Bitbucket API v2 │
       └──────┬────────┘     └────────┬─────────┘
              │                       │
              │  Issues Data          │  PR Data
              └───────────┬───────────┘
                          ▼
             ┌─────────────────────────┐
             │  Report Formatting      │
             │  - Jira Status Counts   │
             │  - PR Turnaround Times  │
             └────────────┬────────────┘
                          │
                          ▼ Formatted Message
             ┌─────────────────────────┐
             │  Slack Incoming Webhook │
             └────────────┬────────────┘
                          │
                          ▼
             ┌─────────────────────────┐
             │  Project Manager / Team │
             │      Slack Channel      │
             └─────────────────────────┘
```

---

## 2. Features

- **Jira Activity Aggregation**:
  - Automatically queries issues assigned to the authenticated user (`currentUser()`) created within the last 7 days.
  - Formats ticket key (with direct hyperlink), issue type, summary, current status, and resolution date (if resolved).
  - Summarizes issue count and aggregate count per status (e.g., `In Progress: 2 | Done: 4`).

- **Bitbucket Pull Request Tracking**:
  - Retrieves all merged pull requests from the specified repository updated within the trailing 7 days.
  - Handles API pagination (`pagelen=50`) automatically via Bitbucket's `next` page links until all recent PRs are fetched.
  - Calculates individual turnaround time (in hours from creation to merge) for each pull request.
  - Computes the aggregate average turnaround time across all merged PRs.

- **Slack Integration**:
  - Generates clean, native Slack `mrkdwn` with formatted hyperlinks (`<URL|Label>`).
  - Joins Jira and Bitbucket digests with clear visual separation.
  - Posts directly to any channel via a single Incoming Webhook.

- **CI/CD Scheduling & Automation**:
  - Includes a pre-configured GitHub Actions workflow (`.github/workflows/slack-test.yml`).
  - Automatically runs every Monday morning at **09:30 IST** (`30 9 * * 1` in `Asia/Kolkata`).
  - Supports manual triggers via `workflow_dispatch`.

- **Developer Tooling & Code Quality**:
  - Strict TypeScript configuration (`ES2022`, `Node16` resolution).
  - ESLint v10 flat configuration with `typescript-eslint` and rule suites.
  - Pre-commit and pre-push hooks managed with **Lefthook**.

---

## 3. Tech Stack

| Component | Technology / Package | Details |
| :--- | :--- | :--- |
| **Runtime** | [Node.js](https://nodejs.org/) | v24 recommended (v18+ supported with native fetch) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | v6.0.3, strictly typed |
| **Package Manager** | [pnpm](https://pnpm.io/) | v10.33.0 (specified in `packageManager`) |
| **HTTP Client** | Native `fetch` API | Built into Node.js (no external HTTP dependencies) |
| **Environment** | [`dotenv`](https://www.npmjs.com/package/dotenv) | Loads environment configuration from `.env` |
| **Code Quality & Linter** | [ESLint](https://eslint.org/) v10 | Flat config (`eslint.config.mts`), typescript-eslint |
| **Git Hooks** | [Lefthook](https://github.com/evilmartians/lefthook) | Pre-commit linting and pre-push typecheck/build gates |
| **CI/CD / Scheduling** | [GitHub Actions](https://github.com/features/actions) | Weekly cron execution and workflow dispatch |
| **APIs** | Atlassian Jira, Atlassian Bitbucket, Slack | Jira REST v3, Bitbucket REST v2, Slack Incoming Webhooks |

---

## 4. How It Works

The execution flow is coordinated by [`src/index.ts`](src/index.ts):

1. **Initialization**: Loads environment variables from `.env` via `dotenv/config`.
2. **Fetch Jira Issues** ([`src/client/jira.client.ts`](src/client/jira.client.ts)):
   - Encodes `${JIRA_EMAIL}:${JIRA_API_TOKEN}` into Base64 for HTTP Basic Authentication.
   - Executes a POST request to `${JIRA_BASE_URL}/rest/api/3/search/jql` with:
     ```sql
     assignee = currentUser() AND created >= -7d ORDER BY created DESC
     ```
   - Retrieves issue summary, creation timestamp, resolution date, issue type, and status.
3. **Fetch Bitbucket PRs** ([`src/client/bitbucket.client.ts`](src/client/bitbucket.client.ts)):
   - Verifies all required Bitbucket variables are present.
   - Encodes `${BITBUCKET_EMAIL}:${BITBUCKET_API_TOKEN}` into Base64 for HTTP Basic Authentication.
   - Queries `https://api.bitbucket.org/2.0/repositories/{workspace}/{repo_slug}/pullrequests?state=MERGED&sort=-updated_on&pagelen=50`.
   - Traverses pagination (`data.next`) until records are older than 7 days, then filters for PRs merged within the last 7 days.
4. **Compile Jira Report** ([`src/reports/generateJiraReport.ts`](src/reports/generateJiraReport.ts)):
   - Groups issues by status and generates a summary string (`Status: Count`).
   - Formats bullet points with Slack-formatted links, type tags, and resolution dates.
5. **Compile Bitbucket Report** ([`src/reports/generateBitbucketReport.ts`](src/reports/generateBitbucketReport.ts)):
   - Computes open-to-merge turnaround time in hours for each PR.
   - Calculates the overall average turnaround time.
   - Formats bullet points with PR links, author names, merge dates, and duration.
6. **Send Slack Notification** ([`src/client/slack.client.ts`](src/client/slack.client.ts)):
   - Merges the two reports separated by `---`.
   - Sends a POST request with `{ "text": full_report }` to `SLACK_WEBHOOK_URL`.
7. **Termination**: If an error occurs, the process logs the error to `console.error` and exits with status code `1`.

---

## 5. Project Structure

```text
weekly-report-generate-script/
├── .github/
│   └── workflows/
│       └── slack-test.yml          # GitHub Actions scheduled cron workflow
├── src/
│   ├── client/
│   │   ├── bitbucket.client.ts     # Bitbucket API client (PR query & pagination)
│   │   ├── jira.client.ts          # Jira Cloud API client (JQL search)
│   │   └── slack.client.ts         # Slack Incoming Webhook sender
│   ├── reports/
│   │   ├── generateBitbucketReport.ts # Bitbucket markdown report builder & metrics
│   │   └── generateJiraReport.ts      # Jira markdown report builder & status summary
│   ├── types/
│   │   ├── BitbucketResponse.ts    # TypeScript interfaces for Bitbucket responses
│   │   └── JiraResponse.ts         # TypeScript interfaces for Jira responses
│   └── index.ts                    # Application entry point
├── .env.example                    # Template for environment variables
├── .gitignore                      # Git ignore file (excludes secrets, build artifacts)
├── eslint.config.mts               # ESLint configuration
├── lefthook.yml                    # Git hooks configuration (pre-commit, pre-push)
├── package.json                    # Project configuration, dependencies, and scripts
├── pnpm-lock.yaml                  # pnpm dependency lockfile
├── tsconfig.json                   # TypeScript compiler configuration
└── README.md                       # Project documentation
```

---

## 6. Prerequisites

Before running the project, ensure you have:

- **Node.js**: Version `24.x` (or Node.js `18+` with native `fetch` support).
- **pnpm**: Version `10.x` (`corepack enable pnpm` or `npm install -g pnpm@10.33.0`).
- **Jira Cloud Access**:
  - An Atlassian account with access to your team's Jira instance.
  - An **Atlassian API Token** generated from [Atlassian Account Settings > Security > Create API token](https://id.atlassian.com/manage-profile/security/api-tokens).
- **Bitbucket Access**:
  - Access to the target Bitbucket workspace and repository.
  - A **Bitbucket App Password / API Token** with repository read permissions (`repository:read`, `pullrequest:read`) created under [Bitbucket Personal Settings > App Passwords](https://bitbucket.org/account/settings/app-passwords/).
- **Slack Access**:
  - Permissions to add an **Incoming Webhook** to the destination Slack channel via [Slack API Apps](https://api.slack.com/apps).

---

## 7. Environment Variables

The application requires specific environment variables to authenticate with external APIs. Define these in a `.env` file in the root directory:

| Variable | Required | Description | Example / Format |
| :--- | :---: | :--- | :--- |
| `JIRA_BASE_URL` | **Yes** | Base URL of your Jira Cloud instance | `https://your-org.atlassian.net` |
| `JIRA_EMAIL` | **Yes** | Account email for Jira authentication | `developer@example.com` |
| `JIRA_API_TOKEN` | **Yes** | Atlassian API token for Basic Authentication | `ATATT...` |
| `JIRA_PROJECT_KEY` | *Optional* | Project key (defined in environment template) | `PROJ` |
| `BITBUCKET_WORKSPACE` | **Yes** | Bitbucket workspace ID or slug | `my-workspace` |
| `BITBUCKET_REPO_SLUG` | **Yes** | Bitbucket repository slug | `my-service-repo` |
| `BITBUCKET_EMAIL` | **Yes** | Account email associated with the Bitbucket token | `developer@example.com` |
| `BITBUCKET_API_TOKEN` | **Yes** | Bitbucket App password / API token | `ATATT...` |
| `SLACK_WEBHOOK_URL` | **Yes** | Full Incoming Webhook URL from Slack | `https://hooks.slack.com/services/...` |

> [!NOTE]
> `JIRA_PROJECT_KEY` is present in the configuration template. The default JQL query filters by `assignee = currentUser() AND created >= -7d`. If you wish to restrict results to a single project, you can update the JQL query in `src/client/jira.client.ts` to include `AND project = '${process.env.JIRA_PROJECT_KEY}'`.

---

## 8. Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd weekly-report-generate-script
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Initialize environment configuration**:
   ```bash
   cp .env.example .env
   ```

4. **Populate `.env`** with your actual credentials (see [Configuration](#9-configuration)).

---

## 9. Configuration

### 1. Jira Setup
1. Log in to [id.atlassian.com](https://id.atlassian.com/manage-profile/security/api-tokens).
2. Click **Create API token**, label it (e.g., `weekly-report-script`), and copy the generated token.
3. Set `JIRA_BASE_URL` to your full Atlassian domain (e.g., `https://company.atlassian.net`).
4. Set `JIRA_EMAIL` to your Atlassian login email address.
5. Set `JIRA_API_TOKEN` to the token generated above.

### 2. Bitbucket Setup
1. Log in to [Bitbucket](https://bitbucket.org/).
2. Navigate to **Personal settings** > **App passwords** > **Create app password**.
3. Grant **Pull requests** (`Read`) and **Repositories** (`Read`) permissions.
4. Set `BITBUCKET_WORKSPACE` to your workspace slug (found in your repository URL: `bitbucket.org/{workspace}/{repo}`).
5. Set `BITBUCKET_REPO_SLUG` to the repository name.
6. Set `BITBUCKET_EMAIL` to your Bitbucket account email.
7. Set `BITBUCKET_API_TOKEN` to the generated App password.

### 3. Slack Webhook Setup
1. Go to [Slack API: Your Apps](https://api.slack.com/apps) and select or create an app.
2. Under **Features**, navigate to **Incoming Webhooks** and switch the toggle to **On**.
3. Click **Add New Webhook to Workspace**, choose the channel where reports should be posted, and authorize.
4. Copy the **Webhook URL** and assign it to `SLACK_WEBHOOK_URL` in `.env`.

---

## 10. Running the Script

### One-Step Build & Execute (Recommended)
Compile TypeScript and trigger report generation immediately:
```bash
pnpm run
```
*(This triggers `pnpm build && pnpm start`)*

### Manual Step-by-Step
1. **Compile TypeScript**:
   ```bash
   pnpm build
   ```
   *(Runs `pnpm lint && tsc`, outputting compiled files to `dist/`)*

2. **Run compiled application**:
   ```bash
   pnpm start
   ```
   *(Executes `node dist/index.js`)*

### Development & Verification Commands
- **Lint the codebase**:
  ```bash
  pnpm lint
  ```
- **Typecheck without emitting JavaScript**:
  ```bash
  pnpm typecheck
  ```
- **Transpile single file (Dev)**:
  ```bash
  pnpm dev
  ```

---

## 11. Automation & Scheduling

### GitHub Actions (Configured)

The repository includes a GitHub Actions workflow in [`.github/workflows/slack-test.yml`](.github/workflows/slack-test.yml).

- **Schedule**: Every Monday at **09:30 AM IST** (`30 9 * * 1` in timezone `Asia/Kolkata`).
- **Manual Trigger**: Supports manual runs at any time via the **Run workflow** button under GitHub Actions (`workflow_dispatch`).

#### Setting up Secrets in GitHub
To enable the GitHub Actions workflow, navigate to **Settings** > **Secrets and variables** > **Actions** in your GitHub repository and add the following repository secrets:

- `JIRA_BASE_URL`
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`
- `BITBUCKET_WORKSPACE`
- `BITBUCKET_REPO_SLUG`
- `BITBUCKET_EMAIL`
- `BITBUCKET_API_TOKEN`
- `SLACK_WEBHOOK_URL`

### Local / Server Cron Alternative
You can also automate the script on a server via standard cron (`crontab -e`):
```cron
# Run every Monday at 09:30 AM
30 9 * * 1 cd /path/to/weekly-report-generate-script && /usr/bin/pnpm run >> /var/log/weekly-report.log 2>&1
```

---

## 12. Slack Report Structure

When the script executes, it posts a formatted message combining the Jira report and Bitbucket report.

### Example Output

```text
*Weekly Jira Report — Sep 17, 2026*
3 issue(s) created this week — In Progress: 1 | Done: 2

• *<https://your-org.atlassian.net/browse/PROJ-101|PROJ-101>* [Story] — Implement user authentication flow
   Status: Done (resolved Sep 15)
• *<https://your-org.atlassian.net/browse/PROJ-102|PROJ-102>* [Task] — Set up Slack incoming webhook integration
   Status: Done (resolved Sep 16)
• *<https://your-org.atlassian.net/browse/PROJ-105|PROJ-105>* [Bug] — Fix pagination boundary on PR fetch
   Status: In Progress

---

*Weekly Bitbucket Report — Sep 17, 2026*
2 PR(s) merged — avg 18.5h from open to merge

• *<https://bitbucket.org/workspace/repo/pull-requests/42|#42>* — feat: add slack reporter client
   By Jane Doe · merged Sep 15 · 24.2h open
• *<https://bitbucket.org/workspace/repo/pull-requests/43|#43>* — fix: parse date string in report generator
   By Jane Doe · merged Sep 16 · 12.8h open
```

---

## 13. API Integrations

### 1. Jira Cloud REST API v3
- **Endpoint**: `POST {JIRA_BASE_URL}/rest/api/3/search/jql`
- **Authentication**: HTTP Basic Auth with `${JIRA_EMAIL}:${JIRA_API_TOKEN}` base64-encoded.
- **Request Body**:
  - `jql`: `"assignee = currentUser() AND created >= -7d ORDER BY created DESC"`
  - `maxResults`: `100`
  - `fields`: `["summary", "created", "resolutiondate", "issuetype", "status"]`

### 2. Bitbucket Cloud REST API v2
- **Endpoint**: `GET https://api.bitbucket.org/2.0/repositories/{BITBUCKET_WORKSPACE}/{BITBUCKET_REPO_SLUG}/pullrequests`
- **Query Parameters**:
  - `state=MERGED`
  - `sort=-updated_on`
  - `pagelen=50`
- **Authentication**: HTTP Basic Auth with `${BITBUCKET_EMAIL}:${BITBUCKET_API_TOKEN}` base64-encoded.
- **Pagination**: Traverses `data.next` links until reaching PRs older than 7 days.

### 3. Slack Incoming Webhooks
- **Endpoint**: `POST {SLACK_WEBHOOK_URL}`
- **Payload**: `{ "text": full_report }`
- **Format**: Slack `mrkdwn` syntax.

---

## 14. Error Handling & Logging

- **Environment Validation**:
  - `src/client/bitbucket.client.ts` validates that `BITBUCKET_WORKSPACE`, `BITBUCKET_REPO_SLUG`, `BITBUCKET_EMAIL`, and `BITBUCKET_API_TOKEN` are defined before making requests.
  - `src/client/slack.client.ts` validates that `SLACK_WEBHOOK_URL` is defined.
- **HTTP Failure Propagation**:
  - Jira client checks `response.ok`; if false, throws an error containing the HTTP status code and response body text.
  - Bitbucket client checks `response.ok`; if false, throws an error with status and response text.
  - Slack client verifies HTTP status; throws `Slack webhook failed: <status> <response_text>` if delivery fails.
- **Global Error Handling**:
  - `src/index.ts` intercepts all uncaught exceptions in the promise chain with `.catch((error) => ...)`, prints the stack trace via `console.error(error)`, and terminates the process with `process.exit(1)`.

---

## 15. Troubleshooting

| Issue | Likely Cause | Solution |
| :--- | :--- | :--- |
| `Jira API failed: 401 Unauthorized` | Invalid `JIRA_EMAIL` or `JIRA_API_TOKEN` | Regenerate your Atlassian API token and verify that the email matches the Atlassian account. |
| `Jira API failed: 403 Forbidden` | Insufficient permissions or SSO restrictions | Check if your organization requires API token authorization through Atlassian Admin. |
| `Bitbucket API failed: 401 Unauthorized` | Invalid `BITBUCKET_EMAIL` or App Password | Confirm the app password is active and has `Repositories (Read)` and `Pull requests (Read)` permissions. |
| `Bitbucket API failed: 404 Not Found` | Incorrect `BITBUCKET_WORKSPACE` or `BITBUCKET_REPO_SLUG` | Check the exact repository URL on Bitbucket: `https://bitbucket.org/<workspace>/<repo_slug>`. |
| `Slack webhook failed: 404 / 400` | Malformed or deleted Slack Webhook URL | Verify `SLACK_WEBHOOK_URL` in `.env`. Ensure the incoming webhook integration has not been removed in Slack. |
| `Missing BITBUCKET_WORKSPACE, ...` | Environment variable not loaded | Ensure `.env` exists in the project root and is populated, or pass environment variables directly in your CI/CD settings. |
| Build fails during `pnpm build` | Lint or typecheck error | Run `pnpm lint` and `pnpm typecheck` to view specific TypeScript or ESLint errors. |

---

## 16. Testing & Quality Assurance

- **Static Type Checking**: The project uses TypeScript in strict mode. Run:
  ```bash
  pnpm typecheck
  ```
- **Linting**: ESLint checks code quality and naming conventions:
  ```bash
  pnpm lint
  ```
- **Git Hooks**: Managed by [Lefthook](lefthook.yml):
  - **Pre-commit**: Runs ESLint against staged `.ts`, `.tsx`, `.js`, and `.jsx` files.
  - **Pre-push**: Runs `pnpm lint`, `pnpm typecheck`, and `pnpm build` before code can be pushed to remote branches.
- *Note*: There is currently no unit test framework (e.g., Jest or Vitest) configured. Code validation is achieved through static analysis and build compilation.

---

## 17. Security Best Practices

- **Never Commit Secrets**: Do not commit `.env` or any credential files to version control. The repository's `.gitignore` explicitly excludes `.env*`.
- **Use Minimal Scopes**:
  - Jira API tokens have user-level permissions; ensure the account only has access to relevant projects.
  - Bitbucket App Passwords should only be granted read access to repositories and pull requests.
- **Secure Webhook URLs**: Treat your `SLACK_WEBHOOK_URL` as a secret. Anyone with the URL can post messages to your channel.
- **CI/CD Credential Management**: Always store sensitive credentials as encrypted GitHub Secrets, never in plain-text workflow files.

---

## 18. License

This project is licensed under the **ISC License** as specified in [`package.json`](package.json).

