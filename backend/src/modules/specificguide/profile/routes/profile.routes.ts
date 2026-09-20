import express from 'express';
import { specificGuideAuthMiddleware } from '../../../../middlewares/auth.midleware.js';
import { deleteProfile, editProfile, getProfile } from '../controllers/profile.controller.js';
const router = express.Router();

router.get('/api/getprofile' , specificGuideAuthMiddleware , getProfile);
router.patch('/api/editprofile' , specificGuideAuthMiddleware , editProfile);
router.delete('/api/deleteprofile' , specificGuideAuthMiddleware , deleteProfile )


export default router;