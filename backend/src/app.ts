
import express from 'express'
import cors from 'cors'
import userRoutes from './modules/user/auth/routes/auth.route.js'
import specificGuideRoutes from './modules/specificguide/auth/routes/auth.route.js'
import commonGuideRoutes from './modules/commonguides/auth/routes/auth.route.js'
import adminRoutes from './modules/admin/auth/routes/auth.route.js'
const app = express();

app.use(express.json());

app.use(
  cors({
    origin: process.env.CLIENTENDURL ?? "http://localhost:8080",
    credentials: true,
  })
);
app.get('/' , (req,res) => {
    res.send(`Hello`)
})

app.use('/users', userRoutes);
app.use('/specificguide' , specificGuideRoutes);
app.use('/commonguide' , commonGuideRoutes);
app.use('/admin', adminRoutes);


//health route
app.get('/api/health', (req, res) => {
    res.json({status:'online' , provider:'Groq' , models :'GROQ_MODELS'})
});

export default app;