import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { listUpcoming, getUserBookings, createBooking, getClassOptions, createClass } from '../controllers/classes.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router: ExpressRouter = Router();

// Public/-ish endpoints
router.get('/upcoming', listUpcoming);

// Crear clases: solo ADMIN — antes cualquier usuario autenticado (paciente,
// empresa) podia crear una clase asignada a cualquier profesional.
router.get('/options', authenticate, authorize('ADMIN'), getClassOptions);
router.post('/', authenticate, authorize('ADMIN'), createClass);

// Protected endpoints for users
router.get('/my-bookings', authenticate, getUserBookings);
router.post('/book', authenticate, createBooking);

export default router;
