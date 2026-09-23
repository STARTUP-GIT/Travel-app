import express from 'express'
import { googleSignIn, googleSignUp, signIn, signOut, signUp } from '../controllers/auth.controller.js';
const router = express.Router();

router.post('/api/auth/signup', signUp)
router.post('/api/auth/google-signup', googleSignUp)
router.post('/api/auth/signin', signIn)
router.post('/api/auth/google-signin', googleSignIn)
router.post('/api/auth/signout', signOut)

export default router
