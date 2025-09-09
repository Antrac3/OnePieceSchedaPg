import { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE =
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

export const handleUpload: RequestHandler = async (req, res) => {
  // basic logging to help debug in dev
  // eslint-disable-next-line no-console
  console.log('[server/upload] incoming request');
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      // eslint-disable-next-line no-console
      console.error('[server/upload] missing service role or url');
      return res.status(500).json({ error: "Server not configured: missing SUPABASE service role key" });
    }

    const { fileName, fileBase64, userId } = req.body as { fileName?: string; fileBase64?: string; userId?: string };
    if (!fileName || !fileBase64 || !userId) {
      // eslint-disable-next-line no-console
      console.warn('[server/upload] bad request, missing fields', { fileName, userId });
      return res.status(400).json({ error: "Missing fileName, fileBase64 or userId in request body" });
    }

    // create admin supabase client with service role key
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // decode base64
    const matches = fileBase64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    let buffer: Buffer;
    if (matches && matches.length === 3) {
      buffer = Buffer.from(matches[2], "base64");
    } else {
      // assume raw base64 without data: prefix
      buffer = Buffer.from(fileBase64, "base64");
    }

    const path = `${userId}/${Date.now()}-${fileName}`;

    // eslint-disable-next-line no-console
    console.log('[server/upload] uploading to supabase path=', path);
    const { error: uploadError } = await supabaseAdmin.storage.from("characters").upload(path, buffer, { upsert: true });
    if (uploadError) {
      // eslint-disable-next-line no-console
      console.error('[server/upload] uploadError:', uploadError);
      return res.status(500).json({ error: uploadError.message || uploadError });
    }

    const { data: pub } = supabaseAdmin.storage.from("characters").getPublicUrl(path) as any;
    const publicUrl = pub?.publicUrl ?? null;

    // eslint-disable-next-line no-console
    console.log('[server/upload] success publicUrl=', publicUrl);
    return res.status(200).json({ publicUrl });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[server/upload] unexpected error:", err);
    return res.status(500).json({ error: String(err) });
  }
};
