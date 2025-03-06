import { connectDB } from "../../../../lib/db";
import Document from "../../../../models/Document";
import { verifyToken } from "../../../../lib/auth";

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

    // Get content
    let content = document.content;
    if (!content && document.processedText) {
      content = document.processedText;
    }

    if (!content) {
      return res.status(400).json({ error: "Document content not found" });
    }

    // Increment download count
    document.downloads += 1;
    await document.save();

    // Set response headers
    res.setHeader("Content-Type", document.fileType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(document.originalName)}"`
    );

    // Send the file content
    const buffer = Buffer.from(content, "base64");
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error("Error downloading document:", error);
    return res.status(500).json({
      error: "Failed to download document",
      details: error.message,
    });
  }
}
