# NoJava Project Rules

## Project Overview
- This is a JavaScript-based web project with a frontend and Cloudflare Workers backend
- The project is a personal website/forum with authentication features
- The frontend includes CSS themes (dark/light), ASCII art, and an animated starfield background
- The backend handles authentication and forum functionality

## Code Organization
- `/js`: Contains the frontend JavaScript files (script.js for main site, forum.js for forum functionality)
- `/css`: Contains stylesheets organized by functionality (base, theme, mobile, auth, forum)
- `/backend`: Contains Cloudflare Workers backend code
- `/images`: Contains website images and icons

## Coding Standards
- Use consistent indentation (2 spaces) throughout the codebase
- Follow the module pattern used in script.js (ThemeManager, StarfieldManager, AuthManager)
- Maintain separation between UI components and business logic
- Use modern ES6+ JavaScript features (arrow functions, async/await, etc.)
- Maintain responsive design with mobile.css for smaller viewports

## Technologies
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Cloudflare Workers (serverless)
- **Authentication**: Custom token-based system
- **Styling**: Custom CSS with theme support
- **Graphics**: ASCII art and canvas-based animations

## Development Workflow
- Use `npm run start` for local development (via start-dev.js)
- Backend code is deployed via Cloudflare Workers
- ASCII frames are generated with gif2ascii_frames.py

## API Integration
- Backend API is located at CONFIG.API_URL in script.js
- Follow the error handling pattern in Utils.fetchWithErrorHandling
- All API calls should include proper error handling and user feedback

## UI/UX Guidelines
- Maintain the retro/terminal aesthetic throughout the site
- Support both dark and light themes
- Ensure animations are performant and don't hinder usability
- Authentication flows should be user-friendly with clear feedback

## Performance Considerations
- Optimize canvas rendering for the starfield
- Consider lazy-loading for forum content
- Keep third-party dependencies to a minimum
- Ensure efficient DOM operations with minimal reflows

## Security Practices
- Use proper authentication token handling
- Sanitize all user inputs, especially in forum content
- Validate data on both client and server sides
- Follow secure password handling practices in the backend

## Documentation
- Document all major functions and components
- Keep CONFIG constants organized and well-commented
- Document any non-obvious UI behaviors or interactions
- Maintain clear structure in module definitions