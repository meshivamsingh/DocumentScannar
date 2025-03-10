import { connectDB } from "../../../../lib/db";
import Document from "../../../../models/Document";
import { verifyToken } from "../../../../lib/auth";

export default async function handler(req, res) {
  // Log the request method and URL for debugging
  console.log("Request method:", req.method);
  console.log("Request URL:", req.url);
  console.log("Query params:", req.query);

  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get token from headers
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Verify token
    const decoded = await verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Connect to database
    await connectDB();

    // Get document ID from query parameters
    const documentId = req.query.id;
    if (!documentId) {
      return res.status(400).json({ error: "Document ID is required" });
    }

    // Find document
    const document = await Document.findOne({
      _id: documentId,
      userId: decoded.userId,
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    console.log("Document found:", {
      id: document._id,
      name: document.name,
      hasContent: !!document.content,
      hasProcessedText: !!document.processedText,
    });

    // Increment view count
    document.views += 1;
    await document.save();

    // Prepare content for response
    let content = null;
    try {
      if (document.content) {
        content = document.content;
      } else if (document.processedText) {
        content = Buffer.from(document.processedText, "base64").toString(
          "utf-8"
        );
      }
    } catch (error) {
      console.error("Error processing content:", error);
      content = "Error processing document content";
    }

    if (!content) {
      console.error("No content found in document");
      return res.status(400).json({ error: "Document content not found" });
    }

    // Return document data
    return res.status(200).json({
      id: document._id,
      name: document.name,
      originalName: document.originalName,
      type: document.type,
      fileType: document.fileType,
      fileSize: document.fileSize,
      content: content,
      analysis: document.analysis,
      views: document.views,
      downloads: document.downloads,
      status: document.status,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  } catch (error) {
    console.error("Error viewing document:", error);
    return res.status(500).json({
      error: "Failed to view document",
      details: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}
