const express = require("express");
const router = express.Router();
const { auth, admin } = require("../middleware/auth");
const CreditRequest = require("../models/CreditRequest");
const User = require("../models/User");

// @route   POST api/credits/request
// @desc    Request additional credits
// @access  Private
router.post("/request", auth, async (req, res) => {
  try {
    const { requestedCredits, reason } = req.body;

    if (!requestedCredits || !reason) {
      return res
        .status(400)
        .json({ msg: "Please provide requested credits and reason" });
    }

    const creditRequest = new CreditRequest({
      userId: req.user.id,
      requestedCredits,
      reason,
    });

    await creditRequest.save();

    res.json(creditRequest);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET api/credits/requests
// @desc    Get all credit requests (admin only)
// @access  Private/Admin
router.get("/requests", [auth, admin], async (req, res) => {
  try {
    const requests = await CreditRequest.find()
      .populate("userId", ["username", "email"])
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   PUT api/credits/requests/:requestId
// @desc    Approve/Reject credit request (admin only)
// @access  Private/Admin
router.put("/requests/:requestId", [auth, admin], async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ msg: "Invalid status" });
    }

    const creditRequest = await CreditRequest.findById(req.params.requestId);

    if (!creditRequest) {
      return res.status(404).json({ msg: "Credit request not found" });
    }

    if (creditRequest.status !== "pending") {
      return res
        .status(400)
        .json({ msg: "Request has already been processed" });
    }

    creditRequest.status = status;
    creditRequest.adminId = req.user.id;
    creditRequest.adminNote = adminNote;
    creditRequest.processedAt = Date.now();

    await creditRequest.save();

    // If approved, add credits to user
    if (status === "approved") {
      const user = await User.findById(creditRequest.userId);
      user.credits += creditRequest.requestedCredits;
      await user.save();
    }

    res.json(creditRequest);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET api/credits/balance
// @desc    Get user's credit balance
// @access  Private
router.get("/balance", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "credits lastCreditReset"
    );
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET api/credits/history
// @desc    Get user's credit request history
// @access  Private
router.get("/history", auth, async (req, res) => {
  try {
    const requests = await CreditRequest.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(requests);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
