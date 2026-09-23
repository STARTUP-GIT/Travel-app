import express from 'express'
import { signIn, signOut, signUp, authorizeGoogleAdmin } from '../controllers/auth.controller.js';
const router = express.Router();

router.post('/api/auth/signup',signUp)
router.post('/api/auth/signin',signIn)
router.post('/api/auth/signout',signOut)
router.post('/api/auth/google-verify',authorizeGoogleAdmin)

export default router