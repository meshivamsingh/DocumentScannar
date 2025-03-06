import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { document, options = {} } = req.body;

    if (!document) {
      return res.status(400).json({ 
        error: 'Missing document',
        details: 'Please provide a base64 encoded document'
      });
    }

    // Decode base64 document
    let decodedDocument;
    try {
      decodedDocument = Buffer.from(document, 'base64').toString();
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid document format',
        details: 'Document must be base64 encoded'
      });
    }

    // Process document with OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a document analysis assistant. Extract and summarize key information from the provided document."
        },
        {
          role: "user",
          content: decodedDocument
        }
      ],
      max_tokens: 500
    });

    // Return processed results
    res.status(200).json({
      success: true,
      results: {
        analysis: completion.choices[0].message.content,
        metadata: {
          format: options.format || 'text',
          language: options.language || 'en',
          timestamp: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Document processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process document',
      details: error.message
    });
  }
} 