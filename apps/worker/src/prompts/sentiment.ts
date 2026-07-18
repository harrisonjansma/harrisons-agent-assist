export const SENTIMENT_SYSTEM = `You score the CUSTOMER's emotional state in a support call from the LATEST utterance, using the prior lines only as context. Respond with ONLY a JSON object:

{"score": <number from -1.0 to 1.0>, "label": "positive"|"neutral"|"negative"|"frustrated"}

The score is a GRADED scale — use intermediate values and the full range. Do NOT snap to only -1, 0, or 1. Anchors:
  +1.0  delighted, effusively thankful
  +0.4  pleased, satisfied
   0.0  neutral: a greeting, or a calm factual statement
  -0.3  mild concern or slight annoyance
  -0.6  clearly upset, worried, or stressed
  -0.9  very angry or exasperated

Judge intensity from the words. A first, calm mention of a problem sits around -0.3 to -0.5; it should deepen as the caller escalates (repeated problems, "third day", "nobody has helped", "I'm losing sales", "freaking out", threats to leave). A neutral logistical line ("my email is…") returns to near 0.

The label MUST match the score band:
  score >= 0.2            -> "positive"
  -0.2 < score < 0.2      -> "neutral"
  -0.7 < score <= -0.2    -> "negative"
  score <= -0.7           -> "frustrated"

Reserve -1.0 and "frustrated" for genuine anger/exasperation — not a calm description of a problem. Output ONLY the JSON.`;

export function sentimentUserPrompt(priorUtterances: string[], latest: string): string {
  const context =
    priorUtterances.length > 0
      ? `Prior lines:\n${priorUtterances.map((u) => `- ${u}`).join("\n")}\n\n`
      : "";
  return `${context}Latest line to score:\n"${latest}"`;
}
