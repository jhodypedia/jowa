// app.js
import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import morgan from "morgan";
import expressLayouts from "express-ejs-layouts";

import db from "./models/index.js"; // loads models & sequelize
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import messagesRoutes from "./routes/messages.js";
import contactsRoutes from "./routes/contacts.js";
import waRoutes from "./routes/wa.js";
import logsRoutes from "./routes/logs.js";

import WAWrapper from "./controllers/waController.js";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: process.env.ALLOWED_ORIGIN || "*" } });

// view engine & layouts
app.set("views", path.join(process.cwd(), "views"));
app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", "layout");

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(express.static(path.join(process.cwd(), "public")));

// mount routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/contacts", contactsRoutes);
app.use("/api/wa", waRoutes);
app.use("/api/logs", logsRoutes);

// pages (EJS)
app.get("/", (req, res) => res.render("login", { title: "Login" }));
app.get("/wa", (req, res) => res.render("wa", { title: "Admin Panel" }));
app.get("/wa-lite", (req, res) => res.render("wa-lite", { title: "Member Panel" }));

// init DB + WA wrapper + socket
(async () => {
  try {
    await db.sequelize.authenticate();
    await db.sequelize.sync({ alter: true });
    console.log("DB connected & synced");

    // seed admin if not exists
    try {
      const adminUser = await db.User.findOne({ where: { role: "admin" } });
      if (!adminUser) {
        const username = process.env.SEED_ADMIN_USERNAME || "admin";
        const email = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
        const password = process.env.SEED_ADMIN_PASS || "admin123";
        await db.User.create({ username, email, password, role: "admin", premium: true });
        console.log("Seed admin created:", username);
      } else {
        console.log("Admin exists:", adminUser.username);
      }
    } catch (e) { console.error("seed admin error", e); }

    const wa = new WAWrapper(io, db);
    app.locals.waWrapper = wa;

    // init WA (auto-reconnect inside)
    await wa.init().catch((e) => console.error("WA init error:", e));

    // socket.io
    io.on("connection", (socket) => {
      console.log("socket connected", socket.id);

      // send existing QR
      const q = wa.getLastQr();
      if (q) {
        console.log("Sending existing QR to", socket.id);
        socket.emit("qr", q);
      } else {
        socket.emit("log", "Menunggu QR dari server...");
      }

      // send status
      wa.status().then(s => socket.emit("wa_state", s)).catch(()=>{});

      // handle refresh request
      socket.on("refresh-qr", async ()=> {
        try { await wa.logout(); } catch(e){ socket.emit("log", String(e)); }
      });

      // client wants contacts
      socket.on("get-contacts", async () => {
        try {
          const contacts = await wa.getContacts();
          socket.emit("contacts.list", contacts);
        } catch (e) { socket.emit("log", String(e)); }
      });
    });

    server.listen(PORT, () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (e) {
    console.error("Startup error:", e);
    process.exit(1);
  }
})();
