import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';

/**
 * POST /api/documents/signed-url
 * Body: { file_path: string }
 * Returns: { signedUrl: string }
 *
 * Accepts either a raw storage path (e.g. "user-id/123_file.jpg")
 * or a full public URL (legacy). In the latter case the path after
 * "/documents/" is extracted automatically.
 */
export async function createSignedUrl(req: Request, res: Response) {
  const { file_path } = req.body as { file_path?: string };

  console.log('[signed-url] received file_path:', file_path);

  if (!file_path) {
    return res.status(400).json({ error: 'file_path is required' });
  }

  // Normalise: if a full URL was stored, split on '/documents/' to extract the storage path
  const storagePath = file_path.includes('/documents/')
    ? file_path.split('/documents/')[1].split('?')[0]
    : file_path;

  console.log('[signed-url] extracted storagePath:', storagePath);

  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(storagePath, 3600); // 1-hour expiry

  console.log('[signed-url] supabase result:', data);
  console.log('[signed-url] supabase error:', error);

  if (error || !data?.signedUrl) {
    return res.status(500).json({ error: error?.message ?? 'Failed to generate signed URL' });
  }

  return res.json({ signedUrl: data.signedUrl });
}
