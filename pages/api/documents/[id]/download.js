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

    // Increment download count
    document.downloads += 1;
    await document.save();

    // Set response headers
    res.setHeader("Content-Type", document.fileType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(document.originalName)}"`
    );
    res.setHeader("Content-Length", document.fileSize);

    // Send the file content
    res.send(Buffer.from(document.content || document.processedText, "base64"));
  } catch (error) {
    console.error("Error downloading document:", error);
    return res.status(500).json({
      error: "Failed to download document",
      details: error.message,
    });
  }
}
