import express from 'express';
import cors from 'cors';
import userRoutes from './modules/user/auth/routes/auth.route.js';
import specificGuideRoutes from './modules/specificguide/auth/routes/auth.route.js';
import commonGuideRoutes from './modules/commonguides/auth/routes/auth.route.js';
import adminRoutes from './modules/admin/auth/routes/auth.route.js';
import userProfileRoutes from './modules/user/profile/routes/profile.routes.js';
import adminProfileRoutes from './modules/admin/profile/routes/profile.routes.js';
import cookieParser from "cookie-parser";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.CLIENTENDURL ?? "http://localhost:8080",
    credentials: true,
  })
);
app.get('/' , (req,res) => {
    res.send(`Hello`)
});

app.use('/users', userRoutes);
app.use('/specificguide' , specificGuideRoutes);
app.use('/commonguide' , commonGuideRoutes);
app.use('/admin', adminRoutes);
app.use('/users/profile', userProfileRoutes);
app.use('/specificguide/profile' ,specificGuideRoutes);
app.use('/commonguide/profile' ,commonGuideRoutes);
app.use('/admin/profile' , adminProfileRoutes);



//health route
app.get('/api/health', (req, res) => {
    res.json({status:'online' , provider:'Groq' , models :'GROQ_MODELS'})
});

export default app;