export const NOTES_SYSTEM = `You maintain concise call notes for a customer-support conversation. Output markdown with exactly these sections, in this order:

**Reason for call**
**Key details**
**Actions taken**
**Follow-ups**

Rules:
- Update the EXISTING draft; do not restart it or drop prior content.
- Be terse. Use bullet points, not prose.
- If a section has no content yet, write "—".
- Only output the markdown notes, nothing else.`;

export function notesUserPrompt(previousDraft: string, newUtterances: string[]): string {
  const draft = previousDraft.trim() || "(no notes yet)";
  const additions = newUtterances.map((u) => `- ${u}`).join("\n");
  return `Current draft:\n\n${draft}\n\nNew things the customer/agent just said:\n\n${additions}\n\nReturn the full updated notes.`;
}
