import { connectDB } from "../../../utils/db";
import Document from "../../../models/Document";
import User from "../../../models/User";
import { verifyToken } from "../../../utils/auth";
import formidable from "formidable";
import fs from "fs";
import path from "path";
import os from "os";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const config = {
  api: {
    bodyParser: false,
  },
};

async function analyzeDocument(content, fileType) {
  try {
    let textContent = content;

    // If it's a PDF, we'll need to extract text first
    if (fileType === "application/pdf") {
      try {
        // For PDFs, we'll just store the base64 content
        // In a production environment, you'd want to use a PDF parsing library
        textContent = "PDF document content";
      } catch (pdfError) {
        console.error("PDF processing error:", pdfError);
        return "Failed to process PDF document.";
      }
    } else {
      // For text files, decode the base64 content
      textContent = Buffer.from(content, "base64").toString("utf-8");
    }

    // Clean and prepare the text content
    textContent = textContent.replace(/\s+/g, " ").trim().substring(0, 4000);

    if (!textContent) {
      return "Document appears to be empty or unreadable.";
    }

    try {
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

      return response.choices[0].message.content;
    } catch (openaiError) {
      console.error("OpenAI API error:", openaiError);
      return "Failed to analyze document. Please try again later.";
    }
  } catch (error) {
    console.error("AI Analysis error:", error);
    return "Failed to analyze document. Please try again later.";
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let tempFilePath = null;

  try {
    console.log("Starting document upload...");

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

    // Ensure user has a name
    if (!user.name) {
      user.name = "User";
      await user.save();
    }

    if (user.credits <= 0) {
      return res.status(403).json({ error: "Insufficient credits" });
    }

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(os.tmpdir(), "document-uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Parse the incoming form data
    const form = formidable({
      uploadDir: uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: (part) => {
        return (
          part.mimetype === "text/plain" ||
          part.mimetype === "application/pdf" ||
          part.mimetype === "application/msword" ||
          part.mimetype ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
      },
    });

    console.log("Parsing form data...");
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error("Form parsing error:", err);
          reject(err);
          return;
        }
        resolve([fields, files]);
      });
    });

    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("File received:", file.originalFilename);
    console.log("File type:", file.mimetype);
    console.log("File size:", file.size);

    tempFilePath = file.filepath;

    try {
      // Read the file content
      console.log("Reading file content...");
      const fileContent = await fs.promises.readFile(file.filepath);
      const base64Content = fileContent.toString("base64");
      console.log("File content read successfully");

      // Create new document
      console.log("Creating document record...");
      const document = new Document({
        userId: decoded.userId,
        originalName: file.originalFilename,
        fileType: file.mimetype,
        fileSize: file.size,
        processedText: base64Content,
        status: "completed",
      });

      await document.save();
      console.log("Document saved successfully");

      // Update user credits
      user.credits -= 1;
      await user.save();

      // Clean up the temporary file
      await fs.promises.unlink(file.filepath);
      tempFilePath = null;

      res.status(200).json({
        success: true,
        document: {
          ...document.toObject(),
          processedText: undefined, // Don't send the processed text in the response
        },
        credits: user.credits,
      });
    } catch (error) {
      console.error("File processing error:", error);
      throw error;
    }
  } catch (error) {
    console.error("Document upload error:", error);

    // Clean up temporary file if it exists
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        await fs.promises.unlink(tempFilePath);
      } catch (unlinkError) {
        console.error("Error cleaning up temporary file:", unlinkError);
      }
    }

    res.status(500).json({
      error: "Failed to process document",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}
