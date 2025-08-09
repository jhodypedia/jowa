// middleware/auth.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
const SECRET = process.env.JWT_SECRET || "changemejwtsecret";

export function verifyToken(req, res, next) {
  const auth = req.headers.authorization || req.query.token;
  if (!auth) return res.status(401).json({ ok:false, message: "Token required" });
  const token = auth.startsWith("Bearer ") ? auth.split(" ")[1] : auth;
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ ok:false, message: "Token invalid" });
  }
}

export function isAdmin(req, res, next) {
  if (req.user && req.user.role === "admin") return next();
  return res.status(403).json({ ok:false, message: "Admin only" });
}

export function requirePremium(req, res, next) {
  if (req.user && (req.user.premium || req.user.role === "admin")) return next();
  return res.status(403).json({ ok:false, message: "Premium required" });
}
