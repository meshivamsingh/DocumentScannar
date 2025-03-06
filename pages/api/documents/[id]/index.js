import { connectDB } from "../../../../utils/db";
import Document from "../../../../models/Document";
import { verifyToken } from "../../../../utils/auth";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Verify authentication
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid token" });
    }

    await connectDB();

    // Find and delete the document
    const document = await Document.findOneAndDelete({
      _id: req.query.id,
      userId: decoded.userId,
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Document deleted successfully" });
  } catch (error) {
    console.error("Delete document error:", error);
    res.status(500).json({
      error: "Failed to delete document",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}
