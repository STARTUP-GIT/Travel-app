import express from 'express';
import { commonGuideAuthMiddleware } from '../../../../middlewares/auth.midleware.js';
import { deleteProfile, editProfile, getProfile, getBookings, updateBookingStatus } from '../controllers/profile.controller.js';
import {
  createPackage,
  deletePackage,
  getAvailableSpecificGuides,
  getPackages,
  updatePackage,
} from '../controllers/package.controller.js';
const router = express.Router();

router.get('/api/getprofile' , commonGuideAuthMiddleware , getProfile);
router.patch('/api/editprofile' , commonGuideAuthMiddleware , editProfile);
router.delete('/api/deleteprofile' , commonGuideAuthMiddleware , deleteProfile )

router.get('/api/bookings' , commonGuideAuthMiddleware , getBookings);
router.patch('/api/bookings/:bookingId/status' , commonGuideAuthMiddleware , updateBookingStatus);

// Tour packages. The guide is taken from the session by the middleware and the
// controller ignores any id in the body, so these routes can only ever touch the
// signed-in guide's own packages. `/packages/:packageId` is declared after the
// collection routes on purpose so it is never swallowed by a `/:something` path.
router.get('/api/packages' , commonGuideAuthMiddleware , getPackages);
router.post('/api/packages' , commonGuideAuthMiddleware , createPackage);
router.patch('/api/packages/:packageId' , commonGuideAuthMiddleware , updatePackage);
router.delete('/api/packages/:packageId' , commonGuideAuthMiddleware , deletePackage);
router.get('/api/specific-guides', commonGuideAuthMiddleware, getAvailableSpecificGuides);


export default router
