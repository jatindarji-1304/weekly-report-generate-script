export async function send_slack_message(message: string): Promise<void> {
  const webhook_url = process.env.SLACK_WEBHOOK_URL;

  if (!webhook_url) {
    throw new Error("SLACK_WEBHOOK_URL is not configured");
  }

  const response = await fetch(webhook_url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: message,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Slack webhook failed: ${response.status} ${await response.text()}`,
    );
  }
}
