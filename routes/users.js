const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { check, validationResult } = require("express-validator");
const User = require("../models/User");
const { auth, admin } = require("../middleware/auth");
const Document = require("../models/Document");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const {
  authLimiter,
  emailVerificationLimiter,
} = require("../middleware/rateLimiter");
const emailTemplates = require("../utils/emailTemplates");

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// @route   GET /api/users/test
// @desc    Test route
// @access  Public
router.get("/test", (req, res) => {
  res.json({ msg: "Users route working" });
});

// @route   POST /api/users/register
// @desc    Register a user
// @access  Public
router.post(
  "/register",
  [
    check("username", "Username is required").not().isEmpty(),
    check("email", "Please include a valid email").isEmail(),
    check(
      "password",
      "Please enter a password with 6 or more characters"
    ).isLength({
      min: 6,
    }),
  ],
  async (req, res) => {
    console.log("Registration attempt received:", {
      username: req.body.username,
      email: req.body.email,
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("Validation errors:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    try {
      let user = await User.findOne({ email });
      if (user) {
        console.log("User already exists:", email);
        return res.status(400).json({ msg: "User already exists" });
      }

      // Generate email verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

      user = new User({
        username,
        email,
        password,
        credits: 20,
        role: "user",
        isVerified: false,
        verificationToken,
        verificationExpires,
      });

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      await user.save();

      // Send verification email
      const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
      await transporter.sendMail({
        to: email,
        subject: "Verify your email address",
        html: `
          <h1>Email Verification</h1>
          <p>Please click the link below to verify your email address:</p>
          <a href="${verificationUrl}">${verificationUrl}</a>
          <p>This link will expire in 24 hours.</p>
        `,
      });

      // Log the registration activity
      await logActivity(user._id, "REGISTRATION", {
        username,
        email,
        timestamp: new Date(),
      });

      const payload = {
        user: {
          id: user.id,
          role: user.role,
        },
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: "24h" },
        (err, token) => {
          if (err) {
            console.error("JWT signing error:", err);
            throw err;
          }
          res.json({
            token,
            msg: "Please check your email to verify your account",
          });
        }
      );
    } catch (err) {
      console.error("Registration error:", err);
      res.status(500).json({
        msg: "Server error",
        error: process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  }
);

// @route   GET /api/users/verify/:token
// @desc    Verify email address
// @access  Public
router.get("/verify/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      verificationToken: req.params.token,
      verificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ msg: "Invalid or expired verification token" });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    // Log the verification activity
    await logActivity(user._id, "EMAIL_VERIFICATION", {
      timestamp: new Date(),
    });

    res.json({ msg: "Email verified successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   POST /api/users/forgot-password
// @desc    Request password reset
// @access  Public
router.post(
  "/forgot-password",
  [check("email", "Please include a valid email").isEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findOne({ email: req.body.email });
      if (!user) {
        return res.status(404).json({ msg: "User not found" });
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetExpires = Date.now() + 3600000; // 1 hour

      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = resetExpires;
      await user.save();

      const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
      await transporter.sendMail({
        to: user.email,
        subject: "Password Reset Request",
        html: `
          <h1>Password Reset Request</h1>
          <p>Please click the link below to reset your password:</p>
          <a href="${resetUrl}">${resetUrl}</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you did not request this, please ignore this email.</p>
        `,
      });

      // Log the password reset request
      await logActivity(user._id, "PASSWORD_RESET_REQUEST", {
        timestamp: new Date(),
      });

      res.json({ msg: "Password reset email sent" });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// @route   POST /api/users/reset-password/:token
// @desc    Reset password
// @access  Public
router.post(
  "/reset-password/:token",
  [
    check(
      "password",
      "Please enter a password with 6 or more characters"
    ).isLength({
      min: 6,
    }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({ msg: "Invalid or expired reset token" });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(req.body.password, salt);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      // Log the password reset completion
      await logActivity(user._id, "PASSWORD_RESET_COMPLETE", {
        timestamp: new Date(),
      });

      res.json({ msg: "Password reset successful" });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// @route   GET /api/users/activity
// @desc    Get user activity log
// @access  Private
router.get("/activity", auth, async (req, res) => {
  try {
    const activities = await Activity.find({ userId: req.user.id })
      .sort({ timestamp: -1 })
      .limit(50);
    res.json(activities);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// Helper function to log user activity
async function logActivity(userId, action, details) {
  try {
    const activity = new Activity({
      userId,
      action,
      details,
      timestamp: new Date(),
    });
    await activity.save();
  } catch (err) {
    console.error("Error logging activity:", err);
  }
}

// @route   GET /api/users/me
// @desc    Get current user
// @access  Private
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put(
  "/profile",
  [
    auth,
    check("username", "Username is required").optional().not().isEmpty(),
    check("email", "Please include a valid email").optional().isEmail(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { username, email } = req.body;
      const updateFields = {};

      // Check if email is already in use
      if (email) {
        const existingUser = await User.findOne({
          email,
          _id: { $ne: req.user.id },
        });
        if (existingUser) {
          return res.status(400).json({ msg: "Email already in use" });
        }
        updateFields.email = email;
      }

      // Check if username is already in use
      if (username) {
        const existingUser = await User.findOne({
          username,
          _id: { $ne: req.user.id },
        });
        if (existingUser) {
          return res.status(400).json({ msg: "Username already in use" });
        }
        updateFields.username = username;
      }

      const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updateFields },
        { new: true }
      ).select("-password");

      res.json(user);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// @route   PUT /api/users/password
// @desc    Change password
// @access  Private
router.put(
  "/password",
  [
    auth,
    check("currentPassword", "Current password is required").exists(),
    check(
      "newPassword",
      "Please enter a new password with 6 or more characters"
    ).isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await User.findById(req.user.id);

      // Check current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ msg: "Current password is incorrect" });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      await user.save();

      res.json({ msg: "Password updated successfully" });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private
router.get("/stats", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    const totalDocuments = await Document.countDocuments({
      userId: req.user.id,
    });

    // Get documents uploaded in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentDocuments = await Document.countDocuments({
      userId: req.user.id,
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Get average document similarity score
    const documents = await Document.find({ userId: req.user.id });
    const avgSimilarity =
      documents.reduce((acc, doc) => acc + (doc.similarity || 0), 0) /
      (documents.length || 1);

    res.json({
      totalDocuments,
      recentDocuments,
      avgSimilarity: parseFloat(avgSimilarity.toFixed(2)),
      credits: user.credits,
      totalScans: user.totalScans,
      accountAge: Math.floor(
        (Date.now() - user.createdAt) / (1000 * 60 * 60 * 24)
      ), // in days
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   DELETE /api/users/account
// @desc    Delete user account
// @access  Private
router.delete("/account", auth, async (req, res) => {
  try {
    // Delete user's documents
    await Document.deleteMany({ userId: req.user.id });

    // Delete user
    await User.findByIdAndDelete(req.user.id);

    res.json({ msg: "Account deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   GET /api/users/search
// @desc    Search users (admin only)
// @access  Private/Admin
router.get("/search", [auth, admin], async (req, res) => {
  try {
    const {
      query,
      sortBy = "createdAt",
      order = "desc",
      page = 1,
      limit = 10,
    } = req.query;

    const searchQuery = {};
    if (query) {
      searchQuery.$or = [
        { username: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ];
    }

    const users = await User.find(searchQuery)
      .select("-password")
      .sort({ [sortBy]: order === "desc" ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(searchQuery);

    res.json({
      users,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   POST /api/users/2fa/enable
// @desc    Enable 2FA for user
// @access  Private
router.post("/2fa/enable", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Document Scanner (${user.email})`,
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString("hex")
    ).map((code) => ({
      code: bcrypt.hashSync(code, 10),
      used: false,
    }));

    // Save secret and backup codes
    user.twoFactorAuth = {
      enabled: false, // Will be enabled after verification
      secret: secret.base32,
      backupCodes,
      lastUsed: null,
    };
    await user.save();

    res.json({
      secret: secret.base32,
      qrCode,
      backupCodes: backupCodes.map((bc) => bc.code),
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   POST /api/users/2fa/verify
// @desc    Verify and enable 2FA
// @access  Private
router.post(
  "/2fa/verify",
  [auth, check("token", "Token is required").not().isEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id);
      const { token } = req.body;

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorAuth.secret,
        encoding: "base32",
        token,
      });

      if (!verified) {
        return res.status(400).json({ msg: "Invalid verification code" });
      }

      user.twoFactorAuth.enabled = true;
      user.twoFactorAuth.lastUsed = new Date();
      await user.save();

      // Send email notification
      await transporter.sendMail({
        to: user.email,
        subject: "Two-Factor Authentication Enabled",
        html: emailTemplates.twoFactorEnabled(user.username),
      });

      // Log the activity
      await logActivity(user._id, "2FA_ENABLED", {
        timestamp: new Date(),
      });

      res.json({ msg: "Two-factor authentication enabled successfully" });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// @route   POST /api/users/2fa/validate
// @desc    Validate 2FA token during login
// @access  Public
router.post(
  "/2fa/validate",
  [
    check("token", "Token is required").not().isEmpty(),
    check("userId", "User ID is required").not().isEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { token, userId, backupCode } = req.body;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ msg: "User not found" });
      }

      let isValid = false;

      if (backupCode) {
        // Check backup code
        const backupCodeMatch = user.twoFactorAuth.backupCodes.find(
          (bc) => !bc.used && bcrypt.compareSync(backupCode, bc.code)
        );

        if (backupCodeMatch) {
          backupCodeMatch.used = true;
          isValid = true;
        }
      } else {
        // Verify TOTP
        isValid = speakeasy.totp.verify({
          secret: user.twoFactorAuth.secret,
          encoding: "base32",
          token,
          window: 1,
        });
      }

      if (!isValid) {
        return res.status(400).json({ msg: "Invalid verification code" });
      }

      user.twoFactorAuth.lastUsed = new Date();
      await user.save();

      // Create JWT token
      const payload = {
        user: {
          id: user.id,
          role: user.role,
        },
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: "24h" },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// @route   POST /api/users/2fa/disable
// @desc    Disable 2FA
// @access  Private
router.post(
  "/2fa/disable",
  [auth, check("password", "Password is required").exists()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id);
      const { password } = req.body;

      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ msg: "Invalid password" });
      }

      // Disable 2FA
      user.twoFactorAuth = {
        enabled: false,
        secret: undefined,
        backupCodes: [],
        lastUsed: null,
      };
      await user.save();

      // Log the activity
      await logActivity(user._id, "2FA_DISABLED", {
        timestamp: new Date(),
      });

      res.json({ msg: "Two-factor authentication disabled successfully" });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

module.exports = router;
