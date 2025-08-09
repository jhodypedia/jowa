// routes/logs.js
import express from "express";
import { verifyToken, isAdmin } from "../middleware/auth.js";
import { listLogs } from "../controllers/logsController.js";

const router = express.Router();

router.get("/", verifyToken, isAdmin, listLogs);

export default router;
