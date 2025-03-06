const express = require("express");
const router = express.Router();
const { auth, admin } = require("../middleware/auth");
const User = require("../models/User");
const Document = require("../models/Document");
const CreditRequest = require("../models/CreditRequest");

// @route   GET api/admin/analytics
// @desc    Get system analytics
// @access  Private/Admin
router.get("/analytics", [auth, admin], async (req, res) => {
  try {
    // Get total users
    const totalUsers = await User.countDocuments();

    // Get total documents
    const totalDocuments = await Document.countDocuments();

    // Get total scans today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scansToday = await Document.countDocuments({
      createdAt: { $gte: today },
    });

    // Get top users by scans
    const topUsers = await User.find()
      .sort({ totalScans: -1 })
      .limit(5)
      .select("username email totalScans");

    // Get credit requests statistics
    const pendingRequests = await CreditRequest.countDocuments({
      status: "pending",
    });
    const approvedRequests = await CreditRequest.countDocuments({
      status: "approved",
    });
    const rejectedRequests = await CreditRequest.countDocuments({
      status: "rejected",
    });

    // Get document topics (basic implementation)
    const recentDocuments = await Document.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .select("content");

    const topics = analyzeTopics(recentDocuments);

    res.json({
      totalUsers,
      totalDocuments,
      scansToday,
      topUsers,
      creditRequests: {
        pending: pendingRequests,
        approved: approvedRequests,
        rejected: rejectedRequests,
      },
      commonTopics: topics,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   PUT api/admin/credits/:userId
// @desc    Manually adjust user credits
// @access  Private/Admin
router.put("/credits/:userId", [auth, admin], async (req, res) => {
  try {
    const { credits } = req.body;

    if (typeof credits !== "number") {
      return res.status(400).json({ msg: "Credits must be a number" });
    }

    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    user.credits = credits;
    await user.save();

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET api/admin/users
// @desc    Get all users
// @access  Private/Admin
router.get("/users", [auth, admin], async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Helper function to analyze document topics
function analyzeTopics(documents) {
  // Simple word frequency analysis
  const wordFreq = {};
  const stopWords = new Set([
    "the",
    "be",
    "to",
    "of",
    "and",
    "a",
    "in",
    "that",
    "have",
    "i",
  ]);

  documents.forEach((doc) => {
    const words = doc.content
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 3 && !stopWords.has(word));

    words.forEach((word) => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
  });

  // Sort by frequency and get top 10
  return Object.entries(wordFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word, freq]) => ({ word, frequency: freq }));
}

module.exports = router;
