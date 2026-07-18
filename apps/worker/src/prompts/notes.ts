export const NOTES_SYSTEM = `You maintain TIGHT call notes for a customer-support conversation. Output markdown with exactly these sections, in this order:

**Reason for call**
**Key details**
**Actions taken**
**Follow-ups**

Rules:
- Update the EXISTING draft — refine and merge; don't restart it or drop established facts.
- Be extremely terse: short bullet fragments, never full sentences. Drop "Customer…" prefixes (it's implied).
- Reason for call: ONE short line.
- Key details: at most 5 bullets, each ≤ ~8 words. Merge related points; keep only what the agent needs to act. Don't restate the reason here.
- Actions taken / Follow-ups: bullets only if something real happened; otherwise "—".
- No filler, no hedging, no repetition.
- Output only the markdown notes, nothing else.`;

export function notesUserPrompt(previousDraft: string, newUtterances: string[]): string {
  const draft = previousDraft.trim() || "(no notes yet)";
  const additions = newUtterances.map((u) => `- ${u}`).join("\n");
  return `Current draft:\n\n${draft}\n\nNew things the customer/agent just said:\n\n${additions}\n\nReturn the full updated notes.`;
}
