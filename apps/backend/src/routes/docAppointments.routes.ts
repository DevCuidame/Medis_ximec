import { Router } from 'express';
import { authenticate, authorize } from '@middleware/auth.middleware.js';
import { getXimenaAppointments, createXimenaAppointment, getXimenaPatients } from '@controllers/docAppointments.controller.js';

const router: Router = Router();

router.get('/patients', authenticate, authorize('ADMIN'), getXimenaPatients);
router.get('/', authenticate, authorize('ADMIN'), getXimenaAppointments);
router.post('/', authenticate, authorize('ADMIN'), createXimenaAppointment);

export default router;
