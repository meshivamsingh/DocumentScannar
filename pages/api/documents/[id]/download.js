import { connectDB } from "../../../../utils/db";
import Document from "../../../../models/Document";
import { verifyToken } from "../../../../utils/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = verifyToken(token);
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
    document.downloadCount += 1;
    await document.save();

    // Set response headers for file download
    res.setHeader("Content-Type", document.fileType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(document.originalName)}"`
    );

    // Handle different file types
    let content;
    if (document.fileType === "application/pdf") {
      // For PDF files, use the original file content if available
      content = document.fileUrl
        ? await fetch(document.fileUrl).then((r) => r.buffer())
        : Buffer.from(document.processedText);
    } else {
      // For text-based files, use the processed text
      content = Buffer.from(document.processedText || "", "utf8");
    }

    res.setHeader("Content-Length", content.length);
    res.status(200).send(content);
  } catch (error) {
    console.error("Document download error:", error);
    res.status(500).json({ error: "Failed to download document" });
  }
}
