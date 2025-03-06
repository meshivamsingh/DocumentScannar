const mongoose = require("mongoose");

const ActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      "REGISTRATION",
      "LOGIN",
      "LOGOUT",
      "EMAIL_VERIFICATION",
      "PASSWORD_RESET_REQUEST",
      "PASSWORD_RESET_COMPLETE",
      "PROFILE_UPDATE",
      "PASSWORD_CHANGE",
      "DOCUMENT_UPLOAD",
      "DOCUMENT_DELETE",
      "CREDIT_PURCHASE",
      "CREDIT_USE",
    ],
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
ActivitySchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model("activity", ActivitySchema);
