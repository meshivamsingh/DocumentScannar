const jwt = require("jsonwebtoken");
const Session = require("../models/Session");
const User = require("../models/User");
const { getClientIp } = require("./ipSecurity");

const auth = async (req, res, next) => {
  // Get token from header
  const token = req.header("x-auth-token");

  // Check if no token
  if (!token) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find active session
    const session = await Session.findOne({
      token,
      userId: decoded.user.id,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      return res.status(401).json({ msg: "Session expired or invalid" });
    }

    // Get user
    const user = await User.findById(decoded.user.id).select("-password");
    if (!user) {
      return res.status(401).json({ msg: "User not found" });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(401).json({ msg: "Please verify your email address" });
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      return res.status(401).json({ msg: "Account is temporarily locked" });
    }

    // Update session activity
    session.lastActivity = new Date();
    await session.save();

    // Add user and session info to request
    req.user = user;
    req.session = session;
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    res.status(401).json({ msg: "Token is not valid" });
  }
};

const admin = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Access denied. Admin only." });
    }
    next();
  } catch (err) {
    console.error("Admin Middleware Error:", err);
    res.status(500).send("Server Error");
  }
};

const createSession = async (userId, req) => {
  try {
    // Generate token
    const payload = {
      user: { id: userId },
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    // Create session
    const session = new Session({
      userId,
      token,
      deviceInfo: {
        deviceId: req.headers["x-device-id"] || "unknown",
        deviceType: req.headers["x-device-type"] || "unknown",
        browser: req.headers["user-agent"],
        os: req.headers["x-os"] || "unknown",
        ip: getClientIp(req),
        userAgent: req.headers["user-agent"],
      },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    await session.save();
    return { token, session };
  } catch (err) {
    console.error("Create Session Error:", err);
    throw err;
  }
};

const invalidateSession = async (token) => {
  try {
    const session = await Session.findOne({ token });
    if (session) {
      session.isActive = false;
      await session.save();
    }
  } catch (err) {
    console.error("Invalidate Session Error:", err);
    throw err;
  }
};

const invalidateAllSessions = async (userId) => {
  try {
    await Session.updateMany(
      { userId, isActive: true },
      { $set: { isActive: false } }
    );
  } catch (err) {
    console.error("Invalidate All Sessions Error:", err);
    throw err;
  }
};

const checkCredits = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    // Check if credits need to be reset (past midnight)
    const now = new Date();
    const lastReset = new Date(user.lastCreditReset);

    if (
      now.getDate() !== lastReset.getDate() ||
      now.getMonth() !== lastReset.getMonth() ||
      now.getFullYear() !== lastReset.getFullYear()
    ) {
      user.credits = process.env.DAILY_CREDIT_LIMIT;
      user.lastCreditReset = now;
      await user.save();
    }

    if (user.credits <= 0) {
      return res.status(403).json({
        msg: "Insufficient credits. Please request more credits or wait for daily reset.",
      });
    }

    next();
  } catch (err) {
    res.status(500).send("Server Error");
  }
};

module.exports = {
  auth,
  admin,
  createSession,
  invalidateSession,
  invalidateAllSessions,
  checkCredits,
};
