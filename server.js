const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Middleware
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? "your-production-domain"
        : "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// MongoDB Connection Options
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, mongooseOptions)
  .then(() => {
    console.log("MongoDB Atlas Connected Successfully");
  })
  .catch((err) => {
    console.error("MongoDB Connection Error:", err.message);
    // Exit process with failure
    process.exit(1);
  });

// Define Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/documents", require("./routes/documents"));
app.use("/api/credits", require("./routes/credits"));
app.use("/api/admin", require("./routes/admin"));

// Test route
app.get("/api/test", (req, res) => {
  res.json({ msg: "API is working" });
});

// Serve static assets in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static("client/build"));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    msg: "Server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`API URL: http://localhost:${PORT}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
  // Do not exit the process in development
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
});
