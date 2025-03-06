import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: false,
      trim: true,
      default: "User",
      validate: {
        validator: function (v) {
          return v !== null && v !== undefined;
        },
        message: "Name cannot be null or undefined",
      },
    },
    email: {
      type: String,
      required: [true, "Please provide your email"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    credits: {
      type: Number,
      default: 20,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    documents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Document",
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    totalScans: {
      type: Number,
      default: 0,
    },
    totalDocuments: {
      type: Number,
      default: 0,
    },
    totalMatches: {
      type: Number,
      default: 0,
    },
    lastCreditReset: {
      type: Date,
      default: Date.now,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    lastLogin: Date,
    twoFactorAuth: {
      enabled: {
        type: Boolean,
        default: false,
      },
      secret: String,
      backupCodes: [
        {
          code: String,
          used: {
            type: Boolean,
            default: false,
          },
        },
      ],
      lastUsed: Date,
    },
    loginAttempts: {
      count: {
        type: Number,
        default: 0,
      },
      lastAttempt: Date,
      lockedUntil: Date,
    },
    settings: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
      },
      language: {
        type: String,
        default: "en",
      },
      securityNotifications: {
        type: Boolean,
        default: true,
      },
      loginAlerts: {
        type: Boolean,
        default: true,
      },
    },
    devices: [
      {
        deviceId: String,
        deviceName: String,
        lastLogin: Date,
        ipAddress: String,
        userAgent: String,
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Generate username from email before saving
userSchema.pre("save", async function (next) {
  if (!this.username) {
    this.username = this.email.split("@")[0];
  }
  next();
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ verificationToken: 1 });
userSchema.index({ resetPasswordToken: 1 });
userSchema.index({ "devices.deviceId": 1 });

// Method to check if account is locked
userSchema.methods.isAccountLocked = function () {
  if (!this.loginAttempts.lockedUntil) return false;
  return this.loginAttempts.lockedUntil > Date.now();
};

// Method to increment login attempts
userSchema.methods.incrementLoginAttempts = async function () {
  this.loginAttempts.count += 1;
  this.loginAttempts.lastAttempt = new Date();

  if (this.loginAttempts.count >= 5) {
    this.loginAttempts.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
  }

  await this.save();
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts.count = 0;
  this.loginAttempts.lockedUntil = undefined;
  await this.save();
};

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
