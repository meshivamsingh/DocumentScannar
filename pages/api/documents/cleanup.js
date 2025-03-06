import { connectDB } from "../../../utils/db";
import Document from "../../../models/Document";
import { verifyToken } from "../../../utils/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Verify authentication and admin status
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    await connectDB();

    // Find documents with API key errors
    const documents = await Document.find({
      status: "failed",
      analysis: { $regex: /API key/i },
    });

    // Update documents with safe error message
    const updates = await Promise.all(
      documents.map((doc) =>
        Document.findByIdAndUpdate(
          doc._id,
          { analysis: "Service configuration error. Please contact support." },
          { new: true }
        )
      )
    );

    res.status(200).json({
      success: true,
      updatedCount: updates.length,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    res.status(500).json({ error: "Failed to cleanup documents" });
  }
}
