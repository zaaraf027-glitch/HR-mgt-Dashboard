const express = require("express");
const Admin = require("../model/admin");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

// ── GET /api/preferences (Fetch Current State) ──────────────────────────────
router.get("/", verifyToken, async (req, res) => {
  try {
    const admin = await Admin.findById(req.adminId);
    if (!admin) {
      return res.status(404).json({ error: "Admin profile not found." });
    }
    return res.json({ antigravityEnabled: !!admin.antigravityEnabled });
  } catch (err) {
    console.error("Fetch preferences failed:", err);
    return res.status(500).json({ error: "Failed to retrieve preferences from database." });
  }
});

// ── POST /api/preferences/toggle-antigravity ─────────────────────────────────
router.post("/toggle-antigravity", verifyToken, async (req, res) => {
  try {
    const admin = await Admin.findById(req.adminId);
    if (!admin) {
      return res.status(404).json({ error: "Admin profile not found." });
    }

    // Toggle value
    admin.antigravityEnabled = !admin.antigravityEnabled;
    await admin.save();

    return res.json({ antigravityEnabled: admin.antigravityEnabled });
  } catch (err) {
    console.error("Toggle antigravity failed:", err);
    return res.status(500).json({ error: "Failed to save toggle state to database." });
  }
});

module.exports = router;
