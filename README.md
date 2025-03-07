# Document Scanner and Analyzer

A Next.js application for scanning, analyzing, and managing documents with AI-powered insights.

## Features

- 📄 Document Upload & Management
- 🔍 AI-Powered Document Analysis
- 📊 Document Statistics (Views & Downloads)
- 🔒 Secure Authentication
- 💾 MongoDB Database Integration
- 🤖 OpenAI GPT Integration

## Tech Stack

- Frontend: Next.js, TailwindCSS, Framer Motion
- Backend: Next.js API Routes
- Database: MongoDB
- Authentication: JWT
- AI: OpenAI GPT-3.5

## Prerequisites

- Node.js 14+ and npm
- MongoDB Database
- OpenAI API Key

## Environment Variables

Create a `.env.local` file in the root directory with:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=your_openai_api_key
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/meshivamsingh/DocumentScannar.git
cd DocumentScannar
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Routes

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user

### Documents
- GET `/api/documents` - List all documents
- POST `/api/documents/scan` - Upload and scan document
- GET `/api/documents/[id]/view` - View document
- GET `/api/documents/[id]/download` - Download document
- POST `/api/documents/[id]/analyze` - Analyze document with AI
- DELETE `/api/documents/[id]/delete` - Delete document

## Database Schema

### User Model
```javascript
{
  name: String,
  email: String,
  password: String,
  credits: Number
}
```

### Document Model
```javascript
{
  userId: ObjectId,
  name: String,
  type: String,
  content: String,
  analysis: String,
  views: Number,
  downloads: Number,
  status: String
}
```

## Deployment

1. Create a Vercel account
2. Link your GitHub repository
3. Set environment variables in Vercel
4. Deploy!

## Testing

Sample test documents are provided in the `/test-data` directory:
- `sample.pdf` - PDF document
- `sample.txt` - Text document
- `sample.docx` - Word document

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is licensed under the MIT License.
