/**
 * Live note drafting (HAR-261). Regeneration cadence and the single-in-flight
 * guarantee are enforced by the caller (Session); this module is the pure LLM
 * step: given the previous draft + only the new utterances, return the updated
 * markdown notes (token discipline — never re-send the whole transcript).
 */
import { complete } from "@call-copilot/shared";
import { NOTES_SYSTEM, notesUserPrompt } from "./prompts/notes.js";

export async function generateNotes(
  previousDraft: string,
  newUtterances: string[],
): Promise<string> {
  const md = await complete(notesUserPrompt(previousDraft, newUtterances), {
    system: NOTES_SYSTEM,
    maxTokens: 500,
    temperature: 0.2,
  });
  return md.trim();
}
