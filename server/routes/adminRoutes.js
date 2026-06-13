const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../model/admin");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

// Helper to validate email format
const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

// ── PUT /api/admin/profile (Update Admin Settings) ──────────────────────────
router.put("/profile", verifyToken, async (req, res) => {
  const { name, email, allowedDepartments, allowedRoles } = req.body;

  // Strict backend validation
  if (!name || typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "Validation failed: Full Name is required." });
  }

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: "Validation failed: A valid Email address is required." });
  }

  if (!Array.isArray(allowedDepartments) || allowedDepartments.length === 0) {
    return res.status(400).json({ error: "Validation failed: At least one allowed department is required." });
  }

  if (allowedDepartments.some(dept => typeof dept !== "string" || dept.trim() === "")) {
    return res.status(400).json({ error: "Validation failed: Department names must be non-empty strings." });
  }

  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    return res.status(400).json({ error: "Validation failed: At least one allowed role is required." });
  }

  if (allowedRoles.some(role => typeof role !== "string" || role.trim() === "")) {
    return res.status(400).json({ error: "Validation failed: Role names must be non-empty strings." });
  }

  try {
    // Check if email is already taken by another admin
    const emailConflict = await Admin.findOne({ 
      email: email.toLowerCase(), 
      _id: { $ne: req.adminId } 
    });
    if (emailConflict) {
      return res.status(400).json({ error: "Validation failed: Email is already in use by another administrator." });
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.adminId,
      {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        allowedDepartments: allowedDepartments.map(d => d.trim()),
        allowedRoles: allowedRoles.map(r => r.trim())
      },
      { new: true, runValidators: true }
    ).select("-passwordHash");

    if (!updatedAdmin) {
      return res.status(404).json({ error: "Admin profile not found." });
    }

    return res.json(updatedAdmin);
  } catch (err) {
    return res.status(500).json({ error: "Failed to update admin profile settings." });
  }
});

// ── PUT /api/admin/change-password ──────────────────────────────────────────
router.put("/change-password", verifyToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current password and new password are required." });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters long." });
  }

  try {
    const admin = await Admin.findById(req.adminId);
    if (!admin) {
      return res.status(404).json({ error: "Admin profile not found." });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: "Incorrect current password." });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    admin.passwordHash = hashedPassword;
    await admin.save();

    // Refreshed JWT cookie
    const token = jwt.sign({ adminId: admin._id }, process.env.JWT_SECRET, {
      expiresIn: "8h"
    });

    res.cookie("nexus_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 8 * 60 * 60 * 1000 // 8 hours
    });

    return res.json({ success: true, message: "Password updated successfully." });
  } catch (err) {
    return res.status(500).json({ error: "Failed to change password." });
  }
});

module.exports = router;
