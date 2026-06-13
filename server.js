const express  = require("express");
const mongoose = require("mongoose");
const dotenv   = require("dotenv");
const cors     = require("cors");
const path     = require("path");
const cookieParser = require("cookie-parser");

dotenv.config();

const app = express();

// ── Middleware ──────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(cookieParser());

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

const Employee = require("./server/model/employee");

async function seedEmployees() {
  try {
    const count = await Employee.countDocuments();
    if (count < 10) {
      console.log(`🌱 Database has only ${count} employees. Clearing and seeding dummy employees...`);
      await Employee.deleteMany({});
      const dummyEmployees = [
        { name: "Sarah Jenkins", department: "Product Design", role: "Senior UX Designer", salary: 95000, joinDate: new Date("2026-04-10"), workMode: "Hybrid" },
        { name: "Marcus Chen", department: "Engineering", role: "Engineering Lead", salary: 130000, joinDate: new Date("2025-11-15"), workMode: "Remote" },
        { name: "Elena Rodriguez", department: "Human Resources", role: "HR Director", salary: 110000, joinDate: new Date("2024-03-20"), workMode: "On-site" },
        { name: "David Wilson", department: "Marketing", role: "Growth Lead", salary: 85000, joinDate: new Date("2026-01-05"), workMode: "Hybrid" },
        { name: "Jessica Taylor", department: "Operations", role: "Operations Manager", salary: 90000, joinDate: new Date("2025-08-12"), workMode: "On-site" },
        { name: "Alexander Pierce", department: "Engineering", role: "Senior Software Engineer", salary: 120000, joinDate: new Date("2026-02-28"), workMode: "Hybrid" },
        { name: "Eleanor Murphy", department: "Product Design", role: "UX Researcher", salary: 80000, joinDate: new Date("2025-05-18"), workMode: "Remote" },
        { name: "Thomas Miller", department: "Finance", role: "Finance Controller", salary: 105000, joinDate: new Date("2025-02-10"), workMode: "On-site" },
        { name: "Sophia Davis", department: "Customer Success", role: "Customer Success Lead", salary: 78000, joinDate: new Date("2026-05-01"), workMode: "Hybrid" },
        { name: "James Anderson", department: "Legal", role: "General Counsel", salary: 145000, joinDate: new Date("2023-07-22"), workMode: "Hybrid" },
        { name: "Olivia Martinez", department: "Product Management", role: "Senior Product Manager", salary: 115000, joinDate: new Date("2025-10-05"), workMode: "Remote" },
        { name: "Liam White", department: "Data & Analytics", role: "Data Scientist", salary: 125000, joinDate: new Date("2026-03-14"), workMode: "Hybrid" },
        { name: "Emma Harris", department: "Sales", role: "Sales Director", salary: 110000, joinDate: new Date("2024-09-01"), workMode: "Hybrid" },
        { name: "Daniel Clark", department: "Engineering", role: "DevOps Engineer", salary: 105000, joinDate: new Date("2026-01-20"), workMode: "Remote" },
        { name: "Isabella Lewis", department: "Marketing", role: "Digital Marketing Specialist", salary: 70000, joinDate: new Date("2026-05-10"), workMode: "Hybrid" }
      ];
      await Employee.insertMany(dummyEmployees);
      console.log("✅ Seeded 15 dummy employees representing 11 departments.");
    } else {
      console.log(`📊 Database already has ${count} employees. Skipping seed.`);
    }
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
  }
}

// ── MongoDB Connection ───────────────────────────────────────────────
async function connectDB() {
  const uri = process.env.MONGO_URI;

  // Guard: catch missing or blank URI before even trying
  if (!uri) {
    console.error("❌  MONGO_URI is not defined in your .env file.");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,   // fail fast instead of hanging
      socketTimeoutMS:          45000,
    });
    console.log("✅  MongoDB Connected successfully.");
    await seedEmployees();
    await authRoutes.seedAdminUser();
  } catch (err) {
    console.error("❌  MongoDB connection failed:");
    console.error("    Reason  :", err.message);
    console.error("    Code    :", err.code   || "N/A");
    console.error("    Host    :", err.hostname || "N/A");
    console.error("\n    💡 Common fixes:");
    console.error("       • Whitelist your IP in MongoDB Atlas → Network Access");
    console.error("       • Verify username/password in .env (no %40 encoding – use literal @)");
    console.error("       • Check cluster name & region are correct in the URI\n");
    // Do NOT call process.exit() – keep the server alive so nodemon doesn't restart loop
  }
}

// Listen for post-connect errors (e.g., dropped connections)
mongoose.connection.on("error", err => {
  console.error("⚠️  Mongoose runtime error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  MongoDB disconnected. Attempting to reconnect…");
});

// ── Start Server ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀  Server running on http://localhost:${PORT}`);
  await connectDB();
});

