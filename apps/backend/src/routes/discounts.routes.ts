import { Router } from 'express'
import { authenticate, authorize } from '@middleware/auth.middleware.js'
import { listDiscounts, createDiscount, updateDiscount, deleteDiscount } from '@controllers/discounts.controller.js'

const router: Router = Router()

router.get(   '/', authenticate, authorize('ADMIN'), listDiscounts)
router.post(  '/', authenticate, authorize('ADMIN'), createDiscount)
router.patch( '/:id', authenticate, authorize('ADMIN'), updateDiscount)
router.delete('/:id', authenticate, authorize('ADMIN'), deleteDiscount)

export default router
