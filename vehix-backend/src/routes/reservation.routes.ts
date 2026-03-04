import { Router } from 'express';
import {
  createReservation,
  getMyReservations,
  getAllReservations,
  getReservationById,
  updateReservationStatus,
  checkAvailability,
} from '../controllers/reservation.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Static routes must be registered before /:id to prevent Express
// from matching literal strings ("my", "availability") as id params.
router.get('/my', requireAuth, getMyReservations);
router.get('/availability', checkAvailability);
router.get('/', requireAuth, requireRole('admin', 'staff'), getAllReservations);
router.get('/:id', requireAuth, getReservationById);
router.post('/', requireAuth, createReservation);
router.patch('/:id/status', requireAuth, requireRole('admin', 'staff'), updateReservationStatus);

export default router;
