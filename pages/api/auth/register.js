import { connectDB } from "../../../utils/db";
import User from "../../../models/User";
import { generateToken } from "../../../utils/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectDB();

    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Please provide all required fields",
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username: email.split("@")[0] }],
    });

    if (existingUser) {
      return res.status(400).json({
        error: "Email already registered",
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      username: email.split("@")[0],
    });

    // Generate token
    const token = generateToken({ userId: user._id });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        credits: user.credits,
        role: user.role,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      error: error.message || "Failed to register user",
    });
  }
}
