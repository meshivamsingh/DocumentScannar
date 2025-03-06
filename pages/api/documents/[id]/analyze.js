import { connectDB } from "../../../../lib/db";
import Document from "../../../../models/Document";
import { verifyToken } from "../../../../lib/auth";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
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

    // Check if document has content
    const content = document.content || document.processedText;
    if (!content) {
      return res.status(400).json({ error: "Document content not found" });
    }

    // Update document status
    document.status = "processing";
    await document.save();

    // Prepare content for analysis
    const textContent = Buffer.from(content, "base64").toString("utf-8");
    const truncatedContent = textContent.slice(0, 4000); // Limit content length

    // Get AI analysis
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a document analysis assistant. Analyze the following document and provide a structured analysis.",
        },
        {
          role: "user",
          content: truncatedContent,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const analysis = completion.choices[0].message.content;

    // Update document with analysis
    document.analysis = analysis;
    document.status = "completed";
    await document.save();

    // Return updated document
    return res.status(200).json({
      document: {
        id: document._id,
        name: document.name,
        type: document.type,
        content: document.content,
        analysis: document.analysis,
        views: document.views,
        downloads: document.downloads,
        status: document.status,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      },
      credits: decoded.credits - 1, // Assuming 1 credit per analysis
    });
  } catch (error) {
    console.error("Error analyzing document:", error);
    return res.status(500).json({
      error: "Failed to analyze document",
      details: error.message,
    });
  }
}
