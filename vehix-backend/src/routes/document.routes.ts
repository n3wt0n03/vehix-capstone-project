import { Router } from 'express';
import { createSignedUrl } from '../controllers/document.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Only authenticated users (admin/staff viewing docs) should get signed URLs
router.post('/signed-url', requireAuth, createSignedUrl);

export default router;
