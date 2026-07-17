/**
 * Per-utterance sentiment scoring (HAR-263). One gpt-4o-mini JSON call per
 * final utterance, with the two prior utterances as context. The alert
 * decision (rolling mean / frustrated) lives in `FrustrationDetector`.
 */
import { complete, type SentimentLabel } from "@call-copilot/shared";
import { SENTIMENT_SYSTEM, sentimentUserPrompt } from "./prompts/sentiment.js";
import { log } from "./logger.js";

export interface SentimentResult {
  score: number;
  label: SentimentLabel;
}

const LABELS: SentimentLabel[] = ["positive", "neutral", "negative", "frustrated"];

export async function scoreSentiment(
  priorUtterances: string[],
  latest: string,
): Promise<SentimentResult> {
  const raw = await complete(sentimentUserPrompt(priorUtterances, latest), {
    system: SENTIMENT_SYSTEM,
    json: true,
    maxTokens: 40,
    temperature: 0,
  });
  try {
    const parsed = JSON.parse(raw) as Partial<SentimentResult>;
    let score = typeof parsed.score === "number" ? parsed.score : 0;
    score = Math.max(-1, Math.min(1, score));
    const label: SentimentLabel = LABELS.includes(parsed.label as SentimentLabel)
      ? (parsed.label as SentimentLabel)
      : "neutral";
    return { score, label };
  } catch (err) {
    log.warn({ err, raw }, "sentiment: bad JSON, defaulting to neutral");
    return { score: 0, label: "neutral" };
  }
}

/**
 * Alerting policy: fire when the rolling mean of the last 3 scored utterances
 * drops below -0.4, OR any single utterance is labelled "frustrated". Rate
 * limited to at most one alert per 30s.
 */
export class FrustrationDetector {
  private recent: number[] = [];
  private lastAlertAt = 0;
  private static readonly COOLDOWN_MS = 30_000;

  /** Returns true if an alert should fire for this result. */
  push(result: SentimentResult): boolean {
    this.recent.push(result.score);
    if (this.recent.length > 3) this.recent.shift();

    const mean = this.recent.reduce((a, b) => a + b, 0) / this.recent.length;
    const trip = mean < -0.4 || result.label === "frustrated";
    if (!trip) return false;

    const now = Date.now();
    if (now - this.lastAlertAt < FrustrationDetector.COOLDOWN_MS) return false;
    this.lastAlertAt = now;
    return true;
  }
}
