// app.js
import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import morgan from "morgan";
import expressLayouts from "express-ejs-layouts";

import sequelize from "./config/database.js";
import db from "./models/index.js";

import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import messagesRoutes from "./routes/messages.js";
import contactsRoutes from "./routes/contacts.js";
import waRoutes from "./routes/wa.js";

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

// simple pages
app.get("/", (req, res) => res.render("login", { title: "Login", error: null }));
app.get("/dashboard", (req, res) => res.render("dashboard", { title: "Dashboard" }));

// start
(async () => {
  try {
    await sequelize.authenticate();
    await db.sequelize.sync({ alter: true });
    console.log("DB connected & synced");

    // WA wrapper instance
    const wa = new WAWrapper(io, db);
    app.locals.waWrapper = wa;

    await wa.init().catch((e) => console.error("WA init error:", e));

    io.on("connection", (socket) => {
      console.log("socket connected", socket.id);
      const qr = wa.getLastQr();
      if (qr) socket.emit("qr", qr);
      socket.emit("log", "[SERVER] connected");
    });

    server.listen(PORT, () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (e) {
    console.error("Startup error:", e);
    process.exit(1);
  }
})();
