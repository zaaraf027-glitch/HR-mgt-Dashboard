const express  = require("express");
const mongoose = require("mongoose");
const dotenv   = require("dotenv");
const cors     = require("cors");
const path     = require("path");
const cookieParser = require("cookie-parser");

dotenv.config();

const app = express();

// ── Middleware ──────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? process.env.CLIENT_ORIGIN || true   // Vercel sets the domain automatically
    : "http://localhost:5000",
  credentials: true                        // Required for httpOnly JWT cookies
}));

app.use(express.json());
app.use(cookieParser());

const connectDB = require("./server/config/db");

// Global DB Connection Middleware for Serverless
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("🔥 [DB Connection Error in Middleware]:", err.message);
    res.status(500).json({ error: "Database connection failed. Please try again later." });
  }
});

// ── Routes ──────────────────────────────────────────────────────────
const employeeRoutes = require("./server/routes/employeeRoutes");
const authRoutes = require("./server/routes/authRoutes");
const adminRoutes = require("./server/routes/adminRoutes");
const preferencesRoutes = require("./server/routes/preferencesRoutes");

app.use("/api/employees", employeeRoutes);
app.use("/api/auth", authRoutes.router);
app.use("/api/admin", adminRoutes);
app.use("/api/preferences", preferencesRoutes);

// Serve Static Frontend Files
app.use(express.static(path.join(__dirname, "client")));

// Redirect root to login page
app.get("/", (req, res) => {
  res.redirect("/login.html");
});

// Listen for post-connect errors (e.g., dropped connections)
mongoose.connection.on("error", err => {
  console.error("⚠️  Mongoose runtime error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  MongoDB disconnected. Attempting to reconnect…");
});

// ── Start Server ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

// Only listen locally. Vercel handles the listener automatically in production.
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`🚀  Server running on http://localhost:${PORT}`);
  });
}

// Export the app for Vercel serverless functions
module.exports = app;
