import express from 'express';
import { adminAuthMiddleware } from '../../../../middlewares/auth.midleware.js';
import { updateDistrictService } from '../controllers/district.controller.js';
const router = express.Router();

router.patch('/:id/service' , adminAuthMiddleware , updateDistrictService);

export default router;