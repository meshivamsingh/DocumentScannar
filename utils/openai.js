const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getDocumentEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text.substring(0, 8000), // OpenAI has a token limit
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Error getting document embedding:", error);
    return null;
  }
}

async function compareDocuments(sourceText, targetText) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a document comparison expert. Analyze the similarity between two documents and provide a similarity score between 0 and 1, along with a brief explanation of the similarities found.",
        },
        {
          role: "user",
          content: `Compare these two documents and provide a similarity score (0-1) and brief explanation:
          Document 1: ${sourceText.substring(0, 2000)}
          Document 2: ${targetText.substring(0, 2000)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 150,
    });

    const result = response.choices[0].message.content;

    // Extract similarity score from response (assuming it's in the format "Score: 0.X")
    const scoreMatch = result.match(/Score: (0\.\d+)/);
    const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0.5;

    return {
      score,
      explanation: result,
    };
  } catch (error) {
    console.error("Error comparing documents:", error);
    return {
      score: 0,
      explanation: "Error comparing documents",
    };
  }
}

async function extractTopics(text) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "Extract the main topics from the given text. Return them as a comma-separated list.",
        },
        {
          role: "user",
          content: text.substring(0, 3000),
        },
      ],
      temperature: 0.3,
      max_tokens: 50,
    });

    const topics = response.choices[0].message.content
      .split(",")
      .map((topic) => topic.trim())
      .filter((topic) => topic.length > 0);

    return topics;
  } catch (error) {
    console.error("Error extracting topics:", error);
    return [];
  }
}

module.exports = {
  getDocumentEmbedding,
  compareDocuments,
  extractTopics,
};
