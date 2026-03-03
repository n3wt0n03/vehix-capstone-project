import { Router } from 'express';
import {
  getAllVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  updateVehicleStatus,
  deleteVehicle,
} from '../controllers/vehicle.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getAllVehicles);
router.get('/:id', getVehicleById);
router.post('/', requireAuth, requireRole('admin'), createVehicle);
router.put('/:id', requireAuth, requireRole('admin'), updateVehicle);
router.patch('/:id/status', requireAuth, requireRole('admin'), updateVehicleStatus);
router.delete('/:id', requireAuth, requireRole('admin'), deleteVehicle);

export default router;
