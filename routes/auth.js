// routes/auth.js
import express from "express";
import { register, login, logout, me } from "../controllers/authController.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";
const router = express.Router();

// admin-only register
router.post("/register", verifyToken, isAdmin, register);
router.post("/login", login);
router.post("/logout", verifyToken, logout);
router.get("/me", verifyToken, me);

export default router;
