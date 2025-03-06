const express = require("express");
const router = express.Router();
const multer = require("multer");
const { auth, checkCredits } = require("../middleware/auth");
const Document = require("../models/Document");
const User = require("../models/User");
const fs = require("fs");

// Ensure uploads directory exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// @route   POST api/documents/scan
// @desc    Upload and scan a document
// @access  Private
router.post(
  "/scan",
  [auth, checkCredits, upload.single("document")],
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ msg: "No file uploaded" });
      }

      // Read file content
      const content = fs.readFileSync(req.file.path, "utf8");

      // Create new document
      const document = new Document({
        title: req.file.originalname,
        content: content,
        userId: req.user.id,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
      });

      await document.save();

      // Deduct credit
      const user = await User.findById(req.user.id);
      user.credits -= 1;
      user.totalScans += 1;
      await user.save();

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      res.json(document);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// @route   POST api/documents/upload
// @desc    Upload a document without scanning
// @access  Private
router.post("/upload", [auth, upload.single("document")], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No file uploaded" });
    }

    // Read file content
    const content = fs.readFileSync(req.file.path, "utf8");

    // Create new document
    const document = new Document({
      title: req.file.originalname,
      content: content,
      userId: req.user.id,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    });

    await document.save();

    // Update user's document count
    const user = await User.findById(req.user.id);
    user.totalDocuments += 1;
    await user.save();

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json(document);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET api/documents/matches/:docId
// @desc    Get matching documents
// @access  Private
router.get("/matches/:docId", auth, async (req, res) => {
  try {
    const sourceDoc = await Document.findById(req.params.docId);
    if (!sourceDoc) {
      return res.status(404).json({ msg: "Document not found" });
    }

    // Basic text similarity search
    const matches = await Document.find({
      $and: [
        { _id: { $ne: sourceDoc._id } },
        { $text: { $search: sourceDoc.content } },
      ],
    })
      .select("title content similarity")
      .limit(10);

    // Calculate similarity scores
    const scoredMatches = matches.map((doc) => {
      const similarity = calculateSimilarity(sourceDoc.content, doc.content);
      return {
        _id: doc._id,
        title: doc.title,
        similarity: similarity,
      };
    });

    res.json(scoredMatches);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET api/documents/user
// @desc    Get user's documents
// @access  Private
router.get("/user", auth, async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(documents);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// Helper function to calculate text similarity
function calculateSimilarity(text1, text2) {
  // Convert texts to word arrays and remove duplicates
  const words1 = new Set(text1.toLowerCase().split(/\W+/));
  const words2 = new Set(text2.toLowerCase().split(/\W+/));

  // Calculate intersection and union
  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  // Calculate Jaccard similarity
  return intersection.size / union.size;
}

module.exports = router;
