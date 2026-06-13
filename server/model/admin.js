const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      default: "HR Director"
    },
    allowedDepartments: {
      type: [String],
      default: [
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
      ]
    },
    allowedRoles: {
      type: [String],
      default: [
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
    },
    antigravityEnabled: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Admin", adminSchema);
