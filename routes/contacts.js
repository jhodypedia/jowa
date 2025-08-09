// routes/contacts.js
import express from "express";
import { verifyToken, requirePremium } from "../middleware/auth.js";
import { listContacts, createContact, updateContact, deleteContact } from "../controllers/contactsController.js";

const router = express.Router();

router.get("/", verifyToken, requirePremium, listContacts);
router.post("/", verifyToken, requirePremium, createContact);
router.put("/:id", verifyToken, requirePremium, updateContact);
router.delete("/:id", verifyToken, requirePremium, deleteContact);

export default router;
