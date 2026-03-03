import { Router } from 'express';
import {
  createReservation,
  getMyReservations,
  getAllReservations,
  getReservationById,
  updateReservationStatus,
} from '../controllers/reservation.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

// /my must be registered before /:id to prevent Express matching "my" as an id
router.get('/my', requireAuth, getMyReservations);
router.get('/', requireAuth, requireRole('admin', 'staff'), getAllReservations);
router.get('/:id', requireAuth, getReservationById);
router.post('/', requireAuth, createReservation);
router.patch('/:id/status', requireAuth, requireRole('admin', 'staff'), updateReservationStatus);

export default router;
