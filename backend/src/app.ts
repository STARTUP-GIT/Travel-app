
import express from 'express'
import cors from 'cors'
import userroutes from './modules/user/auth/routes/auth.route.js'
import specific_guide_routes from './modules/specificguide/auth/routes/auth.route.js'
import common_guide_routes from './modules/commonguides/auth/routes/auth.route.js'
import { METHODS } from 'node:http'
const app = express()

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

app.use('/users', userroutes);
app.use('/specificguide' , specific_guide_routes)
app.use('/commonguide' , common_guide_routes)


//health route
app.get('/api/health', (req, res) => {
    res.json({status:'online' , provider:'Groq' , models :'GROQ_MODELS'})
});

export default app;