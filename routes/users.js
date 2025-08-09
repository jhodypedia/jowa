// routes/users.js
import express from "express";
import { verifyToken, isAdmin } from "../middleware/auth.js";
import { listUsers, getUser, updateUser, deleteUser } from "../controllers/userController.js";

const router = express.Router();

router.get("/", verifyToken, isAdmin, listUsers);
router.get("/:id", verifyToken, isAdmin, getUser);
router.put("/:id", verifyToken, isAdmin, updateUser);
router.delete("/:id", verifyToken, isAdmin, deleteUser);

export default router;
