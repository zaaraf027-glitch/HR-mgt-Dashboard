const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  let token = null;

  // 1. Attempt to extract from cookies
  if (req.cookies && req.cookies.nexus_token) {
    token = req.cookies.nexus_token;
  }

  // 2. Attempt to extract from Authorization header
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") {
      token = parts[1];
    }
  }

  // 3. If token is missing, return 401
  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    // 4. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.adminId = decoded.adminId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Access denied. Invalid or expired token." });
  }
};

module.exports = { verifyToken };
