const mongoose = require("mongoose");

const MONGODB_URI =
  "mongodb+srv://shivam2direct:Shivam0312@cluster0.2yac1.mongodb.net/document-scanner?retryWrites=true&w=majority&appName=Cluster0";

async function testConnection() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Successfully connected to MongoDB.");

    // Test the connection by running a simple query
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    console.log(
      "Available collections:",
      collections.map((c) => c.name)
    );
  } catch (error) {
    console.error("MongoDB connection error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

testConnection();
