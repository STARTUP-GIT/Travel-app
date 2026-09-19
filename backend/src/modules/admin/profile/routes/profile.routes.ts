import express from 'express';
import { adminAuthMiddleware  } from '../../../../middlewares/auth.midleware.js';
import { deleteProfile, editProfile, getProfile } from '../controllers/profile.controller.js';
const router = express.Router();

router.get('/api/getprofile' , adminAuthMiddleware  , getProfile);
router.post('api/editprofile' , adminAuthMiddleware  , editProfile);
router.get('/api/deleteprofile' , adminAuthMiddleware  , deleteProfile);


export default router;