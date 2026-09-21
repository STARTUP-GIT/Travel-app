import express from 'express';
import { adminAuthMiddleware } from '../../../../../middlewares/auth.midleware.js';
import { updateDistrictService, updateDistrictAutoApprove } from '../controllers/district.controller.js';
const router = express.Router();

router.patch('/:stateId/:districtId/districtsservice' , adminAuthMiddleware , updateDistrictService);

router.patch('/:stateId/:districtId/autoapproveplaces' , adminAuthMiddleware , updateDistrictAutoApprove);

export default router;