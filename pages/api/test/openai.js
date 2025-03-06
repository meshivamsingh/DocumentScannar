import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Verify API key is set
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured");
    }

    const { text } = req.body;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: text }],
      max_tokens: 50,
    });

    res.status(200).json({
      message: "OpenAI test successful",
      result: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error("OpenAI test error:", error);
    
    // Handle specific OpenAI errors
    if (error.message.includes("quota")) {
      return res.status(402).json({
        error: "OpenAI API quota exceeded",
        details: "Please check your OpenAI account billing and limits",
        link: "https://platform.openai.com/account/billing/overview"
      });
    }
    
    if (error.message.includes("API key")) {
      return res.status(401).json({
        error: "Invalid OpenAI API key",
        details: "Please check your API key configuration",
        link: "https://platform.openai.com/api-keys"
      });
    }

    res.status(500).json({ 
      error: "Failed to test OpenAI", 
      details: error.message,
      type: error.type || "unknown_error"
    });
  }
}
