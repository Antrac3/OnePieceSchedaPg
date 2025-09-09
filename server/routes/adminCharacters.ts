import { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export const handleAdminCharacters: RequestHandler = async (req, res) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      return res.status(500).json({ error: 'Server not configured: missing SUPABASE service role key' });
    }

    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.replace(/^Bearer\s+/i, '') || null;

    if (!token) return res.status(401).json({ error: 'Missing access token' });

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });

    // verify token and get user id
    let userId: string | null = null;
    try {
      // supabaseAdmin.auth.getUser accepts { access_token } param
      const userRes: any = await (supabaseAdmin.auth as any).getUser(token);
      userId = userRes?.data?.user?.id ?? null;
    } catch (e) {
      // fallback: try auth.api
      try {
        const userRes2: any = await (supabaseAdmin.auth as any).getUser(token);
        userId = userRes2?.data?.user?.id ?? null;
      } catch (err) {
        // cannot verify token
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    if (!userId) return res.status(401).json({ error: 'Invalid token' });

    // check profile role
    const { data: profile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('id,role')
      .eq('id', userId)
      .maybeSingle();
    if (profErr) return res.status(500).json({ error: profErr.message || profErr });
    if (!profile || profile.role !== 'master') return res.status(403).json({ error: 'Forbidden' });

    // fetch all characters with profile info
    const { data, error } = await supabaseAdmin
      .from('characters')
      .select('*, profiles:profiles(id,email,role)')
      .order('updated_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message || error });

    return res.status(200).json({ data });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[server/adminCharacters] unexpected error:', err);
    return res.status(500).json({ error: String(err) });
  }
};
