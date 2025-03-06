const mongoose = require("mongoose");

const CreditRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  requestedCredits: {
    type: Number,
    required: true,
    min: 1,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  reason: {
    type: String,
    required: true,
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  adminNote: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  processedAt: {
    type: Date,
  },
});

module.exports = mongoose.model("CreditRequest", CreditRequestSchema);
