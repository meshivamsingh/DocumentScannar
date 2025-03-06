import { connectDB } from "../../../utils/db";
import Document from "../../../models/Document";
import { verifyToken } from "../../../utils/auth";

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

    // Increment view count
    document.viewCount += 1;
    await document.save();

    // Format the content based on file type
    let processedContent = document.processedText;
    if (document.fileType === "application/pdf" && document.fileUrl) {
      try {
        const response = await fetch(document.fileUrl);
        const buffer = await response.buffer();
        processedContent = buffer.toString("base64");
      } catch (error) {
        console.error("Error fetching PDF content:", error);
      }
    }

    // Return complete document data
    res.status(200).json({
      success: true,
      document: {
        _id: document._id,
        originalName: document.originalName,
        fileType: document.fileType,
        fileSize: document.fileSize,
        processedText: processedContent,
        analysis: document.analysis,
        status: document.status,
        createdAt: document.createdAt,
        viewCount: document.viewCount,
        downloadCount: document.downloadCount,
        errorMessage: document.errorMessage,
        processingTime: document.processingTime,
        language: document.language,
        fileUrl: document.fileUrl,
      },
    });
  } catch (error) {
    console.error("Document fetch error:", error);
    res.status(500).json({ error: "Failed to fetch document" });
  }
}
