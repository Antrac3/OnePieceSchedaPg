import { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export const handleSignedUrl: RequestHandler = async (req, res) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      return res.status(500).json({ error: 'Server not configured: missing SUPABASE service role key' });
    }

    const { path, bucket = 'characters', expires = 60 } = req.body as { path?: string; bucket?: string; expires?: number };
    if (!path) return res.status(400).json({ error: 'Missing path in body' });

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });
    const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, expires);
    if (error) {
      return res.status(500).json({ error: error.message || error });
    }
    return res.status(200).json({ signedUrl: data.signedUrl });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[server/signed-url] unexpected error:', err);
    return res.status(500).json({ error: String(err) });
  }
};
