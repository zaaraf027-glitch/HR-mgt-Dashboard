const mongoose = require('mongoose');
const Employee = require("../model/employee");
const { seedAdminUser } = require("../routes/authRoutes");

// Define the global cache object
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function seedEmployees() {
  try {
    const count = await Employee.countDocuments();
    if (count < 10) {
      console.log(`🌱 Database has only ${count} employees. Clearing and seeding dummy employees...`);
      await Employee.deleteMany({});
      const dummyEmployees = [
        { name: "Sarah Jenkins", department: "Product Design", role: "Senior UX Designer", salary: 95000, joinDate: new Date("2026-04-10"), workMode: "Hybrid" },
        { name: "Marcus Chen", department: "Engineering", role: "Engineering Lead", salary: 130000, joinDate: new Date("2025-11-15"), workMode: "Remote" },
        { name: "Elena Rodriguez", department: "Human Resources", role: "HR Director", salary: 110000, joinDate: new Date("2024-03-20"), workMode: "On-site" }
      ];
      await Employee.insertMany(dummyEmployees);
      console.log("✅ Seeded dummy employees.");
    }
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
  }
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error("❌ MONGO_URI is not defined in your .env file.");
      return null;
    }

    console.log("🔌 Initializing new MongoDB connection...");
    cached.promise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // Fail fast in serverless
      socketTimeoutMS: 45000,
      maxPoolSize: 10 // Limit connections for serverless
    }).then(async (mongooseInstance) => {
      console.log("✅ MongoDB Connected successfully.");
      await seedEmployees();
      await seedAdminUser();
      return mongooseInstance;
    }).catch(err => {
      cached.promise = null;
      throw err;
    });
  }
  
  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    throw err;
  }
}

module.exports = connectDB;
