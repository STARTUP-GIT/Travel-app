import express from 'express'
const app = express()

app.get('/' , (req,res) => {
    res.send(`Hello`)
})



//health route
app.get('/api/health', (req, res) => {
    res.json({status:'online' , provider:'Groq' , models :'GROQ_MODELS'})
});

export default app;