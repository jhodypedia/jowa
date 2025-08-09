// routes/users.js
import express from "express";
import { listUsers, getUser, createUser, updateUser, deleteUser } from "../controllers/userController.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

router.get("/", verifyToken, isAdmin, listUsers);
router.post("/", verifyToken, isAdmin, createUser);
router.get("/:id", verifyToken, getUser);
router.put("/:id", verifyToken, updateUser);
router.delete("/:id", verifyToken, isAdmin, deleteUser);

export default router;
