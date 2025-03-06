import { connectDB } from "@/lib/db";
import Document from "@/models/Document";
import { verifyToken } from "@/lib/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid token" });
    }

    await connectDB();
    const document = await Document.findOne({
      _id: req.query.id,
      userId: decoded.userId,
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Increment view count
    document.views += 1;
    await document.save();

    // Return document data
    return res.status(200).json({
      id: document._id,
      name: document.name,
      type: document.type,
      content: document.content,
      analysis: document.analysis,
      views: document.views,
      downloads: document.downloads,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  } catch (error) {
    console.error("Error viewing document:", error);
    return res.status(500).json({ error: "Failed to view document" });
  }
}
