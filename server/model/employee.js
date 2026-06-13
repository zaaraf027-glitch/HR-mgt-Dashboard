const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  salary: {
    type: Number,
    required: true,
  },
  joinDate: {
    type: Date,
    required: true,
  },
  workMode: {
    type: String,
    enum: ["On-site", "Remote", "Hybrid"],
    default: "Hybrid",
  },
});

module.exports = mongoose.model("Employee", employeeSchema);