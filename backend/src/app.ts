import express from 'express';
import cors from 'cors';
import cookieParser from "cookie-parser";
import dotenv from 'dotenv';
dotenv.config();
const app = express();

/** 
USERS ROUTES IMPORTS  
**/
import userAuthRoutes from './modules/user/auth/routes/auth.route.js';
import userProfileRoutes from './modules/user/profile/routes/profile.routes.js';
import userBookingRoutes from './modules/user/booking/routes/booking.routes.js';

/** 
ADMIN ROUTES IMPORTS
**/
import adminAuthRoutes from './modules/admin/auth/routes/auth.route.js';
import adminProfileRoutes from './modules/admin/profile/routes/profile.routes.js';
import countryRoutes from './modules/admin/location/country/routes/country.route.js';
import stateRoutes from './modules/admin/location/state/routes/state.route.js';
import districtsRoutes from './modules/admin/location/district/routes/district.route.js'

/** 
COMMON GUIDES ROUTES IMPORTS
**/
import commonguideAuthRoutes from './modules/commonguides/auth/routes/auth.route.js';
import commonguideProfileRoutes from './modules/commonguides/profile/routes/profile.routes.js';

/** 
SPECIFIC GUIDES ROUTES IMPORTS
**/
import specificGuideAuthRoutes from './modules/specificguide/auth/routes/auth.route.js';
import specificGuideProfieRoutes from './modules/specificguide/profile/routes/profile.routes.js';

/** 
HOTEL ROUTES IMPORTS
**/
import hotelAuthRoutes from './modules/services/hotel/auth/routes/auth.routes.js';
import hotelOwnerProfileRoutes from './modules/services/hotel/owner/routes/profile.routes.js';
import hotelProfileRoutes from './modules/services/hotel/hotelprofile/routes/profile.routes.js';
import hotelBookingRoutes from './modules/services/hotel/booking/routes/booking.routes.js';

/**
RESTAURANT ROUTES IMPORTS
**/
import restaurantAuthRoutes from './modules/services/restaurant/auth/routes/auth.routes.js';
import restaurantOwnerProfileRoutes from './modules/services/restaurant/owner/routes/profile.routes.js';
import restaurantProfileRoutes from './modules/services/restaurant/restaurentprofile/routes/profile.routes.js';
import restaurantReservationRoutes from './modules/services/restaurant/reservation/routes/reservation.routes.js';

/**
PLACES ROUTES IMPORTS
**/
import placeRoutes from './modules/places/routes/places.routes.js';

/**
 ADMIN PANEL CONFIGURATION ROUTES (isolated 'app config' folder)
**/
import appSettingsRoutes from './app_config/routes/appSettings.routes.js';
import adminConfigRoutes from './app_config/routes/admin.routes.js';





//middlewares
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [process.env.CLIENTENDURL, process.env.ADMINENDURL].filter(
      (origin): origin is string => Boolean(origin)
    ),
    credentials: true,
  })
);







// main route
app.get('/' , (req,res) => {
    res.send(`Hello from slash route by Sathwik , this is coming from app.ts `);
});





/** 
 USERS ROUTES  
**/
app.use('/users', userAuthRoutes);
app.use('/users/profile', userProfileRoutes);
app.use('/users/booking', userBookingRoutes);


/**
 ADMIN ROUTES  
**/
app.use('/admin' , adminAuthRoutes);
app.use('/admin/profile' , adminProfileRoutes);
app.use('/admin/location/countries' , countryRoutes);
app.use('/admin/location',stateRoutes);
app.use('/admin/location' ,districtsRoutes )


/** 
COMMON GUIDES ROUTES  
**/
app.use('/services/:districtId/commonguide' , commonguideAuthRoutes);
app.use('/services/:districtId/commonguide/profile' , commonguideProfileRoutes);

/** 
SPECIFIC GUIDES ROUTES  
**/

app.use('/services/:districtId/specificguide' ,specificGuideAuthRoutes); 
app.use('/services/:districtId/specificguide/profile' ,specificGuideProfieRoutes); 

/** 
HOTEL ROUTES  
**/
app.use('/:districtId/services/hotel', hotelAuthRoutes);
app.use('/:districtId/services/hotel/profile', hotelOwnerProfileRoutes);
app.use('/:districtId/services/hotel', hotelProfileRoutes);
app.use('/:districtId/services/hotel/booking', hotelBookingRoutes);


/**
RESTAURANT ROUTES
**/
app.use('/:districtId/services/restaurant', restaurantAuthRoutes);
app.use('/:districtId/services/restaurant/profile', restaurantOwnerProfileRoutes);
app.use('/:districtId/services/restaurant', restaurantProfileRoutes);
app.use('/:districtId/services/restaurant/reservation', restaurantReservationRoutes);


/**
PLACES ROUTES
**/
app.use('/:districtId/services',placeRoutes);


/**
ADMIN PANEL CONFIGURATION ROUTES
**/
app.use('/api', appSettingsRoutes);
app.use('/api/admin', adminConfigRoutes);










//health route
app.get('/api/health', (req, res) => {
    res.json({status:'online' , provider:'Groq' , models :'GROQ_MODELS'})
});





export default app;