import express from 'express';
import { commonGuideAuthMiddleware } from '../../../../middlewares/auth.midleware.js';
import { deleteProfile, editProfile, getProfile, getBookings, updateBookingStatus } from '../controllers/profile.controller.js';
const router = express.Router();

router.get('/api/getprofile' , commonGuideAuthMiddleware , getProfile);
router.patch('/api/editprofile' , commonGuideAuthMiddleware , editProfile);
router.delete('/api/deleteprofile' , commonGuideAuthMiddleware , deleteProfile )

router.get('/api/bookings' , commonGuideAuthMiddleware , getBookings);
router.patch('/api/bookings/:bookingId/status' , commonGuideAuthMiddleware , updateBookingStatus);


export default router