# Document Scanner

An AI-powered document analysis and processing application built with Next.js, MongoDB, and OpenAI.

## Features

- Document upload and storage
- AI-powered document analysis
- Secure user authentication
- Document management (view, download, delete)
- Credit-based analysis system
- Modern UI with animations

## Prerequisites

- Node.js 16.x or later
- MongoDB database
- OpenAI API key
- npm or yarn package manager

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_API_URL=your_api_url
```

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd document-scanner
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run the development server:

```bash
npm run dev
# or
yarn dev
```

## Deployment

### Vercel Deployment (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Connect your repository to Vercel
3. Configure environment variables in Vercel
4. Deploy!

### Manual Deployment

1. Build the application:

```bash
npm run build
# or
yarn build
```

2. Start the production server:

```bash
npm start
# or
yarn start
```

## Production Considerations

1. Set up proper CORS configuration
2. Configure rate limiting
3. Set up proper error logging
4. Configure proper security headers
5. Set up monitoring and analytics

## Security Best Practices

1. Use HTTPS in production
2. Implement proper input validation
3. Set up proper authentication
4. Configure secure headers
5. Regular security audits

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
