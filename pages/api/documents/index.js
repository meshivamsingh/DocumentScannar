import { connectDB } from "../../../utils/db";
import Document from "../../../models/Document";
import { verifyToken } from "../../../utils/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
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

    // Get user's documents
    const documents = await Document.find({ userId: decoded.userId })
      .sort({ createdAt: -1 })
      .select("-processedText");

    res.status(200).json({
      success: true,
      documents,
    });
  } catch (error) {
    console.error("Failed to fetch documents:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
}
