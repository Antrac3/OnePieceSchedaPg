import { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export const handleCharacterByUser: RequestHandler = async (req, res) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      return res.status(500).json({ error: 'Server not configured: missing SUPABASE service role key' });
    }

    const { userId: targetUserId } = req.body || {};
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.replace(/^Bearer\s+/i, '') || null;

    if (!targetUserId) return res.status(400).json({ error: 'Missing userId' });
    if (!token) return res.status(401).json({ error: 'Missing access token' });

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });

    // verify token and get caller id
    let callerId: string | null = null;
    try {
      const userRes: any = await (supabaseAdmin.auth as any).getUser(token);
      callerId = userRes?.data?.user?.id ?? null;
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (!callerId) return res.status(401).json({ error: 'Invalid token' });

    // if caller is not the same as target, ensure caller is master
    let isMaster = false;
    if (callerId !== targetUserId) {
      const { data: profile, error: profErr } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', callerId)
        .maybeSingle();
      if (profErr) return res.status(500).json({ error: profErr.message || profErr });
      if (!profile || profile.role !== 'master') return res.status(403).json({ error: 'Forbidden' });
      isMaster = true;
    }

    // fetch character for targetUserId
    const { data, error } = await supabaseAdmin
      .from('characters')
      .select('*')
      .eq('user_id', targetUserId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message || error });

    return res.status(200).json({ data });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[server/characterByUser] unexpected error:', err);
    return res.status(500).json({ error: String(err) });
  }
};
