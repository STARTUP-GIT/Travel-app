import express from 'express';
import { specificGuideAuthMiddleware } from '../../../../middlewares/auth.midleware.js';
import { deleteProfile, editProfile, getProfile } from '../controllers/profile.controller.js';
const router = express.Router();

router.get('/api/getprofile' , specificGuideAuthMiddleware , getProfile);
router.post('api/editprofile' , specificGuideAuthMiddleware , editProfile);
router.get('/api/deleteprofile' , specificGuideAuthMiddleware , deleteProfile )


export default router;