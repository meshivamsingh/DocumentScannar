import { connectDB } from "../../../../utils/db";
import Document from "../../../../models/Document";
import User from "../../../../models/User";
import { verifyToken } from "../../../../utils/auth";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function analyzeDocument(content, fileType) {
  try {
    console.log("Starting document analysis...");
    console.log("File type:", fileType);
    let textContent = content;

    // If it's a PDF, we'll need to extract text first
    if (fileType === "application/pdf") {
      console.log("Processing PDF document...");
      try {
        // For PDFs, we'll just store the base64 content
        // In a production environment, you'd want to use a PDF parsing library
        textContent = "PDF document content";
      } catch (pdfError) {
        console.error("PDF processing error:", pdfError);
        throw new Error("Failed to process PDF document");
      }
    } else {
      // For text files, decode the base64 content
      console.log("Processing text document...");
      try {
        textContent = Buffer.from(content, "base64").toString("utf-8");
        console.log("Content length:", textContent.length);
      } catch (decodeError) {
        console.error("Base64 decode error:", decodeError);
        throw new Error("Failed to decode document content");
      }
    }

    // Clean and prepare the text content
    textContent = textContent.replace(/\s+/g, " ").trim().substring(0, 4000);
    console.log("Cleaned content length:", textContent.length);

    if (!textContent) {
      throw new Error("Document appears to be empty or unreadable");
    }

    try {
      console.log("Sending request to OpenAI...");
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a document analysis assistant. Analyze the provided document and provide:\n1. A brief summary\n2. Key points or main ideas\n3. Important insights or findings\n4. Any recommendations or action items\n\nFormat your response in a clear, structured way with appropriate headings.",
          },
          {
            role: "user",
            content: textContent,
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      console.log("Received response from OpenAI");

      if (!response.choices || !response.choices[0]?.message?.content) {
        throw new Error("No analysis generated from OpenAI");
      }

      return response.choices[0].message.content;
    } catch (openaiError) {
      console.error("OpenAI API error:", openaiError);
      throw new Error(`OpenAI API error: ${openaiError.message}`);
    }
  } catch (error) {
    console.error("AI Analysis error:", error);
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("Starting document analysis request...");

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
    console.log("Connected to database");

    // Check user credits
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.credits <= 0) {
      return res.status(403).json({ error: "Insufficient credits" });
    }

    // Get document
    const document = await Document.findOne({
      _id: req.query.id,
      userId: decoded.userId,
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    if (!document.processedText) {
      return res.status(400).json({ error: "Document content not found" });
    }

    console.log("Document found:", document._id);
    console.log("Document type:", document.fileType);

    // Update document status to processing
    document.status = "processing";
    await document.save();

    // For PDFs, we'll skip the analysis for now
    let newAnalysis = null;
    if (document.fileType !== "application/pdf") {
      try {
        console.log("Starting document analysis...");
        newAnalysis = await analyzeDocument(
          document.processedText,
          document.fileType
        );
        console.log("Analysis completed successfully");
      } catch (analysisError) {
        console.error("Analysis error:", analysisError);
        document.status = "failed";
        await document.save();
        return res.status(500).json({
          error: "Failed to analyze document",
          details: analysisError.message,
        });
      }
    } else {
      console.log("Skipping analysis for PDF document");
    }

    // Update document with new analysis
    document.analysis = newAnalysis;
    document.status = "completed";
    await document.save();

    // Update user credits
    user.credits -= 1;
    await user.save();

    // Return the updated document and user credits
    res.status(200).json({
      success: true,
      document: {
        ...document.toObject(),
        processedText: undefined, // Don't send the processed text in the response
      },
      credits: user.credits,
    });
  } catch (error) {
    console.error("Document analysis error:", error);
    res.status(500).json({
      error: "Failed to analyze document",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}
