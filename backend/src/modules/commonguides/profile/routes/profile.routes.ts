import express from 'express';
import { commonGuideAuthMiddleware } from '../../../../middlewares/auth.midleware.js';
import { deleteProfile, editProfile, getProfile } from '../controllers/profile.controller.js';
const router = express.Router();

router.get('/api/getprofile' , commonGuideAuthMiddleware , getProfile);
router.patch('/api/editprofile' , commonGuideAuthMiddleware , editProfile);
router.delete('/api/deleteprofile' , commonGuideAuthMiddleware , deleteProfile )


export default router