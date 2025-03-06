const mongoose = require("mongoose");

const SessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  deviceInfo: {
    deviceId: String,
    deviceType: String,
    browser: String,
    os: String,
    ip: String,
    userAgent: String,
    location: {
      country: String,
      city: String,
      latitude: Number,
      longitude: Number,
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
SessionSchema.index({ userId: 1, token: 1 });
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to check if session is expired
SessionSchema.methods.isExpired = function () {
  return this.expiresAt < new Date();
};

// Method to extend session
SessionSchema.methods.extend = async function () {
  this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Extend by 24 hours
  this.lastActivity = new Date();
  await this.save();
};

module.exports = mongoose.model("session", SessionSchema);
