import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      console.error('[api/upload] missing supabase config');
      return res.status(500).json({ error: 'Server not configured: missing SUPABASE service role key' });
    }

    const { fileName, fileBase64, userId } = req.body || {};
    if (!fileName || !fileBase64 || !userId) {
      console.warn('[api/upload] bad request, missing fields', { fileName, userId });
      return res.status(400).json({ error: 'Missing fileName, fileBase64 or userId in request body' });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // decode base64
    const matches = String(fileBase64).match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    let buffer: Buffer;
    if (matches && matches.length === 3) {
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(fileBase64, 'base64');
    }

    const path = `${userId}/${Date.now()}-${fileName}`;
    console.log('[api/upload] uploading to supabase path=', path);

    const { error: uploadError } = await supabaseAdmin.storage.from('characters').upload(path, buffer, { upsert: true });
    if (uploadError) {
      console.error('[api/upload] uploadError:', uploadError);
      return res.status(500).json({ error: uploadError.message || uploadError });
    }

    const { data: pub } = supabaseAdmin.storage.from('characters').getPublicUrl(path) as any;
    const publicUrl = pub?.publicUrl ?? null;
    console.log('[api/upload] success publicUrl=', publicUrl);

    return res.status(200).json({ publicUrl });
  } catch (err: any) {
    console.error('[api/upload] unexpected error:', err);
    return res.status(500).json({ error: String(err) });
  }
}
