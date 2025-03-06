import { connectDB } from "@/lib/db";
import Document from "@/models/Document";
import { verifyToken } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    await connectDB();
    const document = await Document.findOne({
      _id: params.id,
      userId: decoded.userId,
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Increment view count
    document.views += 1;
    await document.save();

    // Return document data
    return NextResponse.json({
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
    return NextResponse.json(
      { error: "Failed to view document" },
      { status: 500 }
    );
  }
}
