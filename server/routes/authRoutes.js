const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../model/admin");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

// ── GET /api/auth/me (Get Current User) ────────────────────────────────────
router.get("/me", verifyToken, async (req, res) => {
  try {
    const admin = await Admin.findById(req.adminId).select("-passwordHash");
    if (!admin) {
      return res.status(404).json({ error: "Admin not found." });
    }
    return res.json(admin);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch session profile." });
  }
});

// ── POST /api/auth/register (Sign Up) ──────────────────────────────────────
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "Full Name is required." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(String(email).toLowerCase())) {
    return res.status(400).json({ error: "A valid Email address is required." });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long." });
  }

  try {
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({ error: "An account with this email address already exists." });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newAdmin = new Admin({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: hashedPassword,
      role: "HR Manager", // default role for newly registered admins
      allowedDepartments: [
        "Product Design",
        "Engineering",
        "Human Resources",
        "Marketing",
        "Operations",
        "Finance",
        "Customer Success",
        "Legal",
        "Product Management",
        "Data & Analytics",
        "Sales"
      ],
      allowedRoles: [
        "HR Director",
        "HR Manager",
        "Engineering Lead",
        "Senior Software Engineer",
        "Senior UX Designer",
        "Growth Lead",
        "Operations Manager",
        "UX Researcher",
        "Finance Controller",
        "Customer Success Lead",
        "General Counsel",
        "Senior Product Manager",
        "Data Scientist",
        "Sales Director",
        "DevOps Engineer",
        "Digital Marketing Specialist"
      ]
    });

    await newAdmin.save();

    // Auto log in the newly registered admin
    const token = jwt.sign({ adminId: newAdmin._id }, process.env.JWT_SECRET, {
      expiresIn: "8h"
    });

    res.cookie("nexus_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 8 * 60 * 60 * 1000 // 8 hours
    });

    const adminProfile = newAdmin.toObject();
    delete adminProfile.passwordHash;

    return res.status(201).json(adminProfile);
  } catch (err) {
    console.error("Registration failed:", err);
    return res.status(500).json({ error: "Registration failed due to a server error." });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    // Sign JWT token
    const token = jwt.sign({ adminId: admin._id }, process.env.JWT_SECRET, {
      expiresIn: "8h"
    });

    // Set cookie
    res.cookie("nexus_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 8 * 60 * 60 * 1000 // 8 hours
    });

    // Send admin profile without password hash
    const adminProfile = admin.toObject();
    delete adminProfile.passwordHash;

    return res.json(adminProfile);
  } catch (err) {
    return res.status(500).json({ error: "Login failed due to a server error." });
  }
});

// ── POST /api/auth/logout ──────────────────────────────────────────────────
router.post("/logout", (req, res) => {
  res.clearCookie("nexus_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  });
  return res.json({ success: true, message: "Logged out successfully." });
});

// ── Startup Seeding Function ───────────────────────────────────────────────
async function seedAdminUser() {
  const defaultEmail = "admin@nexushr.com";
  const defaultPassword = "Admin@123";

  try {
    const existingAdmin = await Admin.findOne({ email: defaultEmail });
    if (!existingAdmin) {
      console.log(`🌱 Default admin account not found. Seeding ${defaultEmail}...`);
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(defaultPassword, salt);

      const newAdmin = new Admin({
        name: "Elena Rodriguez",
        email: defaultEmail,
        passwordHash: hashedPassword,
        role: "HR Director",
        allowedDepartments: [
          "Product Design",
          "Engineering",
          "Human Resources",
          "Marketing",
          "Operations",
          "Finance",
          "Customer Success",
          "Legal",
          "Product Management",
          "Data & Analytics",
          "Sales"
        ],
        allowedRoles: [
          "HR Director",
          "HR Manager",
          "Engineering Lead",
          "Senior Software Engineer",
          "Senior UX Designer",
          "Growth Lead",
          "Operations Manager",
          "UX Researcher",
          "Finance Controller",
          "Customer Success Lead",
          "General Counsel",
          "Senior Product Manager",
          "Data Scientist",
          "Sales Director",
          "DevOps Engineer",
          "Digital Marketing Specialist"
        ]
      });

      await newAdmin.save();
      console.log("✅ Default admin account seeded successfully.");
    } else {
      console.log(`📊 Default admin account ${defaultEmail} already exists. Skipping seed.`);
    }
  } catch (err) {
    console.error("❌ Failed to seed default admin user:", err.message);
  }
}

module.exports = {
  router,
  seedAdminUser
};
