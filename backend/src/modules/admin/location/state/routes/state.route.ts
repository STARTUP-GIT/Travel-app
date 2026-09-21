import express from 'express';
import { adminAuthMiddleware } from '../../../../../middlewares/auth.midleware.js';
import { updateStateService } from '../controllers/state.controller.js';
const router = express.Router();

router.patch('/:countryId/:stateid/stateservice' , adminAuthMiddleware , updateStateService);

export default router;