import express from 'express';
import { adminAuthMiddleware } from '../../../../../middlewares/auth.midleware.js';
import { updateCountryService } from '../controllers/country.controller.js';
const router = express.Router();

router.patch('/:id/service' , adminAuthMiddleware , updateCountryService);

export default router;