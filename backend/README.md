# Cloudflare Workers Authentication API

A simple user authentication system using Cloudflare Workers and Durable Objects.

## Features

- User registration with email, username, and password
- User login with email and password
- Session token generation and storage
- Password hashing for security
- CORS support for cross-origin requests
- User data storage in Durable Objects

## Setup and Deployment

### Prerequisites

- Node.js installed
- Cloudflare account
- Wrangler CLI configured with your Cloudflare account

### Local Development

1. Install dependencies:
   ```
   npm install
   ```

2. Start the local development server:
   ```
   npm run dev
   ```

### Deployment

To deploy to Cloudflare Workers:

```
npm run deploy
```

After deployment, update the API URL in the `test-client.html` file with your actual worker URL.

## Testing the API

Open the `src/test-client.html` file in your browser to test the authentication API. You can register a new user and then log in with the registered credentials.

## API Endpoints

### Register User

```
POST /api/register
```

Request body:
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password"
}
```

### Login User

```
POST /api/login
```

Request body:
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

## Security Considerations

- This is a simple authentication system for demonstration purposes
- In a production environment, consider:
  - Using a proper JWT library for token generation
  - Implementing rate limiting
  - Adding email verification
  - Using a more robust password hashing algorithm
  - Adding additional security headers 