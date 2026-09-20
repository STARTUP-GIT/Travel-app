import express from "express";
import {
  signIn,
  signOut,
  signUp,
} from "../controllers/auth.controllers.js";

const router = express.Router();

router.post("/api/auth/signup", signUp);
router.post("/api/auth/signin", signIn);
router.post("/api/auth/signout", signOut);

export default router;