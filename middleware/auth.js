// middleware/auth.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
const SECRET = process.env.JWT_SECRET || "changemejwtsecret";

export function verifyToken(req, res, next) {
  const auth = req.headers.authorization || req.cookies?.token || req.body?.token;
  if (!auth) return res.status(401).json({ message: "Token tidak ditemukan" });
  const token = auth.startsWith("Bearer ") ? auth.split(" ")[1] : auth;
  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Token invalid" });
    req.user = decoded;
    next();
  });
}

export function isAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "Tidak terautentikasi" });
  if (req.user.role !== "admin") return res.status(403).json({ message: "Butuh akses admin" });
  next();
}

// admin OR premium allowed
export function requirePremium(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "Tidak terautentikasi" });
  if (req.user.role === "admin" || req.user.premium) return next();
  return res.status(403).json({ message: "Hanya untuk pengguna premium" });
}
