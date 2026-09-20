import express from 'express';
import { userauthMiddleware } from '../../../../middlewares/auth.midleware.js';
import { deleteProfile, editProfile, getProfile } from '../controllers/profile.controller.js';
const router = express.Router();

router.get('/api/getprofile' , userauthMiddleware , getProfile);
router.patch('/api/editprofile' , userauthMiddleware , editProfile);
router.delete('/api/deleteprofile' , userauthMiddleware , deleteProfile);


export default router