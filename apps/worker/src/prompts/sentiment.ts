export const SENTIMENT_SYSTEM = `You score the CUSTOMER's sentiment in a support call from the latest utterance, using the prior lines only as context. Respond with a single JSON object:

{"score": <number -1..1>, "label": "positive"|"neutral"|"negative"|"frustrated"}

- score: -1 = very upset, 0 = neutral, 1 = very happy.
- Use "frustrated" only for clear anger/exasperation (repeated problems, "ridiculous", "nobody helps me", threats to leave).
- Output ONLY the JSON.`;

export function sentimentUserPrompt(priorUtterances: string[], latest: string): string {
  const context =
    priorUtterances.length > 0
      ? `Prior lines:\n${priorUtterances.map((u) => `- ${u}`).join("\n")}\n\n`
      : "";
  return `${context}Latest line to score:\n"${latest}"`;
}
