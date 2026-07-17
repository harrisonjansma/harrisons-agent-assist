/**
 * Read-only doc lookup for the "expand card" interaction (HAR-262). Uses the
 * Supabase anon key; RLS (migration 0003) permits anon to read only `docs`.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  if (!url || !anon) {
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }
  const supabase = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await supabase.from("docs").select("id,title,body").eq("id", id).single();
  if (error || !data) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}
