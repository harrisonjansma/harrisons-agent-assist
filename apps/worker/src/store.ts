/**
 * Persistence seam for a Session. The real implementation talks to Supabase
 * (service role); tests supply an in-memory fake. Keeping this behind an
 * interface is what makes the orchestration integration-testable without a DB.
 */
import { serverDb } from "@call-copilot/shared";

export interface SessionStore {
  /** Insert a finalized utterance; returns its row id (or null on failure). */
  insertUtterance(sessionId: string, text: string, speaker?: string): Promise<number | null>;
  /** Upsert the running notes draft for a session. */
  upsertNotes(sessionId: string, markdown: string): Promise<void>;
  /** Attach a sentiment score to a previously-inserted utterance. */
  updateUtteranceSentiment(id: number, sentiment: number): Promise<void>;
  /** Mark the session ended. */
  endSession(sessionId: string): Promise<void>;
}

export function supabaseStore(): SessionStore {
  return {
    async insertUtterance(sessionId, text, speaker) {
      const { data, error } = await serverDb()
        .from("utterances")
        // speaker defaults to 'user' at the DB level (single-speaker mic path);
        // diarized calls record 'agent'/'customer'.
        .insert({ session_id: sessionId, text, ...(speaker ? { speaker } : {}) })
        .select("id")
        .single();
      if (error || !data) return null;
      return data.id as number;
    },
    async upsertNotes(sessionId, markdown) {
      const { error } = await serverDb()
        .from("notes")
        .upsert({ session_id: sessionId, markdown, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    async updateUtteranceSentiment(id, sentiment) {
      const { error } = await serverDb().from("utterances").update({ sentiment }).eq("id", id);
      if (error) throw error;
    },
    async endSession(sessionId) {
      const { error } = await serverDb()
        .from("sessions")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", sessionId);
      if (error) throw error;
    },
  };
}
