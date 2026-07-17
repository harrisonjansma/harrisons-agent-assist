/**
 * Seed the docs corpus (HAR-262). Reads supabase/seed/docs/*.md, embeds each
 * body in one batch, and upserts into `docs`. Idempotent: upsert-on-title, so
 * re-running updates rather than duplicating.
 *
 *   pnpm seed
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { embed, serverDb } from "@call-copilot/shared";
import { log } from "./logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = join(__dirname, "../../../supabase/seed/docs");

interface SeedDoc {
  title: string;
  body: string;
}

function loadDocs(): SeedDoc[] {
  const files = readdirSync(DOCS_DIR).filter((f) => f.endsWith(".md"));
  return files.map((file) => {
    const parsed = matter(readFileSync(join(DOCS_DIR, file), "utf8"));
    const title = (parsed.data.title as string) ?? file.replace(/\.md$/, "");
    return { title, body: parsed.content.trim() };
  });
}

async function main(): Promise<void> {
  const docs = loadDocs();
  if (docs.length === 0) {
    log.error({ dir: DOCS_DIR }, "no seed docs found");
    process.exit(1);
  }
  log.info({ count: docs.length }, "embedding docs");

  const embeddings = await embed(docs.map((d) => d.body));

  const rows = docs.map((d, i) => ({
    title: d.title,
    body: d.body,
    embedding: embeddings[i] as number[],
  }));

  const { error } = await serverDb().from("docs").upsert(rows, { onConflict: "title" });
  if (error) {
    log.error({ error }, "seed upsert failed");
    process.exit(1);
  }
  log.info({ count: rows.length }, "seed complete");
  process.exit(0);
}

void main();
