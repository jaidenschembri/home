import { DurableObject } from "cloudflare:workers";

/**
 * Welcome to Cloudflare Workers! This is your first Durable Objects application.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your Durable Object in action
 * - Run `npm run deploy` to publish your application
 *
 * Learn more at https://developers.cloudflare.com/durable-objects
 */

/**
 * Env provides a mechanism to reference bindings declared in wrangler.jsonc within JavaScript
 *
 * @typedef {Object} Env
 * @property {DurableObjectNamespace} MY_DURABLE_OBJECT - The Durable Object namespace binding
 */

/** A Durable Object's behavior is defined in an exported Javascript class */
export class MyDurableObject extends DurableObject {
	/**
	 * The constructor is invoked once upon creation of the Durable Object, i.e. the first call to
	 * 	`DurableObjectStub::get` for a given identifier (no-op constructors can be omitted)
	 *
	 * @param {DurableObjectState} ctx - The interface for interacting with Durable Object state
	 * @param {Env} env - The interface to reference bindings declared in wrangler.jsonc
	 */
	constructor(ctx, env) {
		super(ctx, env);
	}

	/**
	 * The Durable Object exposes an RPC method sayHello which will be invoked when when a Durable
	 *  Object instance receives a request from a Worker via the same method invocation on the stub
	 *
	 * @param {string} name - The name provided to a Durable Object instance from a Worker
	 * @returns {Promise<string>} The greeting to be sent back to the Worker
	 */
	async sayHello(name) {
		return `Hello, ${name}!`;
	}
}

// Main Worker entry point for authentication API

// Helper function to generate a response
function jsonResponse(data, status = 200, request = null) {
	// Get the origin from the request or use a wildcard as fallback
	const origin = request?.headers?.get('Origin');
	console.log(`Request origin in jsonResponse: ${origin}`);
	
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': origin || '*',  // Allow any origin
			'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			'Access-Control-Max-Age': '86400',   // Cache preflight requests for 24 hours
		},
	});
}

// === INVITE CODE SETUP ===
const INVITE_CODE = "letmein123"; // <-- set your invite code here
console.log('Registration invite code:', INVITE_CODE);

// Login handler
async function handleLogin(request, env) {
	try {
		const { username, password } = await request.json();
		console.log(`Attempting login for user: ${username}`);

		if (!username || !password) {
			return jsonResponse({ error: 'Username and password are required' }, 400, request);
		}

		// Get the user Durable Object
		const id = env.USERS.idFromName(`user-${username}`);
		const userObj = env.USERS.get(id);
		
		// Use the proper absolute URL for Durable Object
		const requestURL = new URL(request.url);
		const doURL = new URL(requestURL.origin);
		doURL.pathname = "/login";
		
		console.log(`Calling Durable Object with URL: ${doURL.toString()}`);
		
		// Forward the Origin header to the Durable Object
		const headers = new Headers();
		if (request.headers.has('Origin')) {
			headers.set('Origin', request.headers.get('Origin'));
		}
		
		// Call the login method on the Durable Object
		const response = await userObj.fetch(doURL.toString(), {
			method: 'POST',
			headers,
			body: JSON.stringify({ username, password }),
		});
		
		console.log(`Durable Object login response status: ${response.status}`);
		
		return response;
	} catch (error) {
		console.error('Login error:', error);
		return jsonResponse({ error: `Login failed: ${error.message}` }, 500, request);
	}
}

// Registration handler
async function handleRegister(request, env) {
	try {
		const { email, username, password, inviteCode } = await request.json();
		console.log(`Attempting registration for user: ${username}, email: ${email}`);

		if (!email || !username || !password || !inviteCode) {
			return jsonResponse({ error: 'Email, username, password, and invite code are required' }, 400, request);
		}
		if (inviteCode !== INVITE_CODE) {
			return jsonResponse({ error: 'Invalid invite code' }, 403, request);
		}

		// Get the user Durable Object - use username as the consistent identifier
		const id = env.USERS.idFromName(`user-${username}`);
		const userObj = env.USERS.get(id);
		
		// Use the proper absolute URL for Durable Object
		const requestURL = new URL(request.url);
		const doURL = new URL(requestURL.origin);
		doURL.pathname = "/register";
		
		console.log(`Calling Durable Object with URL: ${doURL.toString()}`);
		
		// Forward the Origin header to the Durable Object
		const headers = new Headers();
		if (request.headers.has('Origin')) {
			headers.set('Origin', request.headers.get('Origin'));
		}
		
		// Call the register method on the Durable Object
		const response = await userObj.fetch(doURL.toString(), {
			method: 'POST',
			headers,
			body: JSON.stringify({ email, username, password, inviteCode })
		});
		
		console.log(`Durable Object registration response status: ${response.status}`);
		
		return response;
	} catch (error) {
		console.error('Registration error:', error);
		return jsonResponse({ error: `Registration failed: ${error.message}` }, 500, request);
	}
}

// === AUTH MODAL LOGIC ===
function initAuthModal() {
	// Configure API URL based on environment
	// Use the same URL in both local development and production since our changes are deployed
	const API_URL = 'https://still-wood-e0a1.jaidenschembri1.workers.dev';
	console.log('Using API URL:', API_URL);
}

// Request handler for the Worker
export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const path = url.pathname;
		const origin = request.headers.get('Origin');

		// Handle CORS preflight requests
		if (request.method === 'OPTIONS') {
			console.log(`OPTIONS request from origin: ${origin}`);
			return new Response(null, {
				status: 204,
				headers: {
					'Access-Control-Allow-Origin': origin || '*',
					'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
					'Access-Control-Max-Age': '86400',
				},
			});
		}

		// Route requests to the appropriate handler
		if (path === '/api/register' && request.method === 'POST') {
			return handleRegister(request, env);
		}
		
		if (path === '/api/login' && request.method === 'POST') {
			return handleLogin(request, env);
		}

		if (path === '/api/validate' && request.method === 'GET') {
			return handleValidate(request, env);
		}

		// Forum API endpoints - support both /threads and /posts paths
		if ((path === '/api/forum/threads' || path === '/api/forum/posts') && request.method === 'GET') {
			return handleGetThreads(request, env);
		}

		if ((path === '/api/forum/threads' || path === '/api/forum/posts') && request.method === 'POST') {
			return handleCreateThread(request, env);
		}

		// Handle replies to threads - support both /threads and /posts paths
		const threadReplyMatch = path.match(/^\/api\/forum\/threads\/([^\/]+)\/replies$/);
		const postReplyMatch = path.match(/^\/api\/forum\/posts\/([^\/]+)\/replies$/);
		
		if ((threadReplyMatch || postReplyMatch) && request.method === 'POST') {
			const threadId = threadReplyMatch ? threadReplyMatch[1] : postReplyMatch[1];
			return handleCreateReply(request, env, threadId);
		}

		// Default response for unhandled routes
		return jsonResponse({ error: 'Not found' }, 404, request);
	}
};

// Validate token handler
async function handleValidate(request, env) {
	try {
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return jsonResponse({ valid: false }, 401, request);
		}
		
		const token = authHeader.split(' ')[1];
		if (!token) {
			return jsonResponse({ valid: false }, 401, request);
		}
		
		// Try to get username from forum sessions first (easier and more efficient)
		const forumId = env.FORUM.idFromName('forum-data');
		const forumObj = env.FORUM.get(forumId);
		
		// Use the proper absolute URL for Durable Object
		const requestURL = new URL(request.url);
		const doURL = new URL(requestURL.origin);
		doURL.pathname = "/validate";
		
		// Forward the Authorization header to the Durable Object
		const headers = new Headers();
		headers.set('Authorization', authHeader);
		if (request.headers.has('Origin')) {
			headers.set('Origin', request.headers.get('Origin'));
		}
		
		// Call the validate method on the Forum Object
		try {
			const response = await forumObj.fetch(doURL.toString(), {
				method: 'GET',
				headers
			});
			
			if (response.status === 200) {
				return response;
			}
		} catch (error) {
			console.error('Error validating with forum object:', error);
			// Fall through to try individual user validation
		}
		
		// If we got here, the forum object couldn't validate the token.
		// This could happen if sessions aren't synced properly.
		// As a last resort, we'll have to check each user one by one.
		
		console.log("Forum validation failed, trying to find the user directly...");
		// We need to find which user has this token by checking with the user object
		// This is inefficient but works as a fallback
		
		// In a real app, you would keep track of which user has which token
		// For this simple app, we'll just use a simple heuristic - try the username in the token
		// (This assumes the token has something to do with the username, which isn't secure)
		
		// Extract a username from the token (hacky, but useful for demo)
		// This is a very basic approach that only works if token is uuid-like
		const possibleUsername = token.split('-')[0];
		if (possibleUsername) {
			try {
				const userId = env.USERS.idFromName(`user-${possibleUsername}`);
				const userObj = env.USERS.get(userId);
				
				const userValidateURL = new URL(requestURL.origin);
				userValidateURL.pathname = "/validate";
				
				const userResponse = await userObj.fetch(userValidateURL.toString(), {
					method: 'GET',
					headers
				});
				
				if (userResponse.status === 200) {
					return userResponse;
				}
			} catch (error) {
				console.error(`Error validating token for user ${possibleUsername}:`, error);
				// Fall through to invalid response
			}
		}
		
		// If all validation attempts fail
		return jsonResponse({ valid: false, error: 'Invalid token' }, 401, request);
	} catch (error) {
		console.error('Validation error:', error);
		return jsonResponse({ valid: false, error: error.message }, 500, request);
	}
}

// Forum threads handler - Get all threads
async function handleGetThreads(request, env) {
	try {
		// Check for authentication
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return jsonResponse({ error: 'Authentication required' }, 401, request);
		}
		
		// Get the forum Durable Object
		const id = env.FORUM.idFromName('forum-data');
		const forumObj = env.FORUM.get(id);
		
		// Use the proper absolute URL for Durable Object
		const requestURL = new URL(request.url);
		const doURL = new URL(requestURL.origin);
		doURL.pathname = "/threads";
		
		// Forward the headers to the Durable Object
		const headers = new Headers();
		headers.set('Authorization', authHeader);
		if (request.headers.has('Origin')) {
			headers.set('Origin', request.headers.get('Origin'));
		}
		
		// Call the getThreads method on the Durable Object
		const response = await forumObj.fetch(doURL.toString(), {
			method: 'GET',
			headers
		});
		
		return response;
	} catch (error) {
		console.error('Get threads error:', error);
		return jsonResponse({ error: `Failed to get threads: ${error.message}` }, 500, request);
	}
}

// Forum threads handler - Create a new thread
async function handleCreateThread(request, env) {
	try {
		// Check for authentication
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return jsonResponse({ error: 'Authentication required' }, 401, request);
		}
		
		// Get the forum Durable Object
		const id = env.FORUM.idFromName('forum-data');
		const forumObj = env.FORUM.get(id);
		
		// Use the proper absolute URL for Durable Object
		const requestURL = new URL(request.url);
		const doURL = new URL(requestURL.origin);
		doURL.pathname = "/threads";
		
		// Forward all headers and the body to the Durable Object
		const headers = new Headers(request.headers);
		
		// Call the createThread method on the Durable Object
		const response = await forumObj.fetch(doURL.toString(), {
			method: 'POST',
			headers,
			body: request.body
		});
		
		return response;
	} catch (error) {
		console.error('Create thread error:', error);
		return jsonResponse({ error: `Failed to create thread: ${error.message}` }, 500, request);
	}
}

// Forum replies handler - Create a new reply to a thread
async function handleCreateReply(request, env, threadId) {
	try {
		// Check for authentication
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return jsonResponse({ error: 'Authentication required' }, 401, request);
		}
		
		// Get the forum Durable Object
		const id = env.FORUM.idFromName('forum-data');
		const forumObj = env.FORUM.get(id);
		
		// Use the proper absolute URL for Durable Object
		const requestURL = new URL(request.url);
		const doURL = new URL(requestURL.origin);
		doURL.pathname = `/threads/${threadId}/replies`;
		
		// Forward all headers and the body to the Durable Object
		const headers = new Headers(request.headers);
		
		// Call the createReply method on the Durable Object
		const response = await forumObj.fetch(doURL.toString(), {
			method: 'POST',
			headers,
			body: request.body
		});
		
		return response;
	} catch (error) {
		console.error('Create reply error:', error);
		return jsonResponse({ error: `Failed to create reply: ${error.message}` }, 500, request);
	}
}

// Define the User Durable Object class
export class UsersObject extends DurableObject {
	constructor(state, env) {
		super(state, env);
		this.state = state;
		this.env = env;
	}

	// Helper function to create a proper CORS response
	corsResponse(data, status = 200, request) {
		const origin = request?.headers?.get('Origin');
		console.log(`Request origin: ${origin}`);
		
		return new Response(JSON.stringify(data), {
			status,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': origin || '*',  // Allow any origin or the specific one
				'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				'Access-Control-Max-Age': '86400',
			},
		});
	}

	// Simple password hashing (in a real app, use a proper hashing library)
	async hashPassword(password) {
		const encoder = new TextEncoder();
		const data = encoder.encode(password);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
	}

	async fetch(request) {
		const url = new URL(request.url);
		const path = url.pathname;
		
		console.log(`Durable Object received request with path: ${path}, full URL: ${request.url}`);
		
		// Check for both exact path matches and basename matches
		if (path === '/register' || path.endsWith('/register')) {
			return this.register(request);
		}

		if (path === '/login' || path.endsWith('/login')) {
			return this.login(request);
		}

		if (path === '/validate' || path.endsWith('/validate')) {
			return this.validate(request);
		}

		console.log(`Path not matched: ${path}`);
		return jsonResponse({ error: `Not found: ${path}` }, 404, request);
	}

	// Validate a token
	async validate(request) {
		// Get the token from the Authorization header
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return this.corsResponse({ valid: false }, 401, request);
		}
		
		const token = authHeader.split(' ')[1];
		if (!token) {
			return this.corsResponse({ valid: false }, 401, request);
		}
		
		// Get the session
		const session = await this.state.storage.get("session");
		if (!session || session.token !== token) {
			return this.corsResponse({ valid: false }, 401, request);
		}
		
		// Check if token is expired
		const expiresAt = new Date(session.expiresAt);
		if (expiresAt < new Date()) {
			return this.corsResponse({ valid: false, error: 'Token expired' }, 401, request);
		}
		
		// Get user data
		const userData = await this.state.storage.get("userData");
		if (!userData) {
			return this.corsResponse({ valid: false, error: 'User not found' }, 404, request);
		}
		
		// Token is valid
		return this.corsResponse({
			valid: true,
			user: {
				username: userData.username,
				email: userData.email
			}
		}, 200, request);
	}

	async register(request) {
		const { email, username, password, inviteCode } = await request.json();
		if (!inviteCode || inviteCode !== INVITE_CODE) {
			return this.corsResponse({ error: 'Invalid invite code' }, 403, request);
		}
		// Check if user already exists
		const existingUser = await this.state.storage.get("userData");
		if (existingUser) {
			return this.corsResponse({ error: 'User already exists' }, 409, request);
		}
		// Create and store user data with hashed password
		const hashedPassword = await this.hashPassword(password);
		await this.state.storage.put("userData", {
			email,
			username,
			password: hashedPassword,
			createdAt: new Date().toISOString()
		});
		
		return this.corsResponse({ success: true, message: 'User registered successfully' }, 200, request);
	}

	async login(request) {
		const { username, password } = await request.json();
		// Get user data
		const userData = await this.state.storage.get("userData");
		if (!userData) {
			return this.corsResponse({ error: 'User not found' }, 404, request);
		}
		// Check if username matches (allow login with either username or email)
		if (userData.username !== username && userData.email !== username) {
			return this.corsResponse({ error: 'Invalid credentials' }, 401, request);
		}
		// Check if password matches
		const hashedPassword = await this.hashPassword(password);
		if (userData.password !== hashedPassword) {
			return this.corsResponse({ error: 'Invalid credentials' }, 401, request);
		}
		// Generate a simple token (in a real app, use a proper JWT library)
		const token = crypto.randomUUID();
		// Store the session token
		const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
		await this.state.storage.put("session", {
			token,
			username: userData.username,
			expiresAt
		});
		
		// Also store the session in the forum object so it can validate tokens
		try {
			const forumId = this.env.FORUM.idFromName('forum-data');
			const forumObj = this.env.FORUM.get(forumId);
			
			const url = new URL(request.url);
			url.pathname = "/store-session";
			
			await forumObj.fetch(url.toString(), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					username: userData.username, 
					token, 
					expiresAt 
				})
			});
		} catch (error) {
			console.error('Error storing session in forum object:', error);
			// Continue anyway, the user is still logged in
		}
		
		return this.corsResponse({
			success: true,
			token,
			user: {
				email: userData.email,
				username: userData.username
			}
		}, 200, request);
	}
}

// Define the Forum Durable Object class for handling forum posts
export class ForumObject extends DurableObject {
	constructor(state, env) {
		super(state, env);
		this.state = state;
		this.env = env;
	}

	// Helper function to create a proper CORS response
	corsResponse(data, status = 200, request) {
		const origin = request?.headers?.get('Origin');
		
		return new Response(JSON.stringify(data), {
			status,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': origin || '*',
				'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				'Access-Control-Max-Age': '86400',
			},
		});
	}

	// Get username from token
	async getUsernameFromToken(token) {
		// For simplicity, we'll use the token to find the user directly
		const sessions = await this.state.storage.get("sessions") || {};
		
		// Find the session with the matching token
		for (const [username, sessionData] of Object.entries(sessions)) {
			if (sessionData.token === token) {
				// Check if token is expired
				const expiresAt = new Date(sessionData.expiresAt);
				if (expiresAt > new Date()) {
					return username;
				}
			}
		}
		
		return null;
	}

	// Validate the user's token
	async validateToken(request) {
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return null;
		}
		
		const token = authHeader.split(' ')[1];
		if (!token) {
			return null;
		}
		
		// Get username from token
		const username = await this.getUsernameFromToken(token);
		if (!username) {
			return null;
		}
		
		return username;
	}

	async fetch(request) {
		const url = new URL(request.url);
		const path = url.pathname;
		
		// Route requests based on path
		if (path === '/validate' || path.endsWith('/validate')) {
			return this.validateRequest(request);
		}
		
		if (path === '/threads' || path.endsWith('/threads')) {
			if (request.method === 'GET') {
				return this.getThreads(request);
			} else if (request.method === 'POST') {
				return this.createThread(request);
			}
		}
		
		// Handle replies to threads
		const replyMatch = path.match(/^\/threads\/([^\/]+)\/replies$/);
		if (replyMatch && request.method === 'POST') {
			const threadId = replyMatch[1];
			return this.createReply(request, threadId);
		}
		
		// Handle session storage
		if (path === '/store-session' || path.endsWith('/store-session')) {
			return this.storeSessionRequest(request);
		}
		
		return this.corsResponse({ error: `Not found: ${path}` }, 404, request);
	}

	// Validate the token and return user info
	async validateRequest(request) {
		const username = await this.validateToken(request);
		
		if (!username) {
			return this.corsResponse({ valid: false }, 401, request);
		}
		
		return this.corsResponse({
			valid: true,
			user: { username }
		}, 200, request);
	}

	// Get all threads
	async getThreads(request) {
		const username = await this.validateToken(request);
		if (!username) {
			return this.corsResponse({ error: 'Authentication required' }, 401, request);
		}
		
		// Get threads from storage
		const threads = await this.state.storage.get("threads") || [];
		
		return this.corsResponse({ threads }, 200, request);
	}

	// Create a new thread
	async createThread(request) {
		const username = await this.validateToken(request);
		if (!username) {
			return this.corsResponse({ error: 'Authentication required' }, 401, request);
		}
		
		// Parse the request body
		const { subject, content } = await request.json();
		
		if (!content || content.trim() === '') {
			return this.corsResponse({ error: 'Thread content is required' }, 400, request);
		}
		
		// Get existing threads
		const threads = await this.state.storage.get("threads") || [];
		
		// Create new thread
		const threadId = Date.now().toString(); // Simple ID generation
		const newThread = {
			id: threadId,
			subject: subject || '',
			content,
			username,
			timestamp: new Date().toISOString(),
			replies: []
		};
		
		// Add to beginning of threads array
		threads.unshift(newThread);
		
		// Store updated threads
		await this.state.storage.put("threads", threads);
		
		return this.corsResponse({ 
			success: true,
			thread: newThread
		}, 201, request);
	}

	// Create a reply to a thread
	async createReply(request, threadId) {
		const username = await this.validateToken(request);
		if (!username) {
			return this.corsResponse({ error: 'Authentication required' }, 401, request);
		}
		
		// Parse the request body
		const { content } = await request.json();
		
		if (!content || content.trim() === '') {
			return this.corsResponse({ error: 'Reply content is required' }, 400, request);
		}
		
		// Get existing threads
		const threads = await this.state.storage.get("threads") || [];
		
		// Find the thread to reply to
		const threadIndex = threads.findIndex(t => t.id === threadId);
		if (threadIndex === -1) {
			return this.corsResponse({ error: 'Thread not found' }, 404, request);
		}
		
		// Create new reply
		const replyId = Date.now().toString(); // Simple ID generation
		const newReply = {
			id: replyId,
			content,
			username,
			timestamp: new Date().toISOString()
		};
		
		// Add reply to the thread
		threads[threadIndex].replies.push(newReply);
		
		// Store updated threads
		await this.state.storage.put("threads", threads);
		
		return this.corsResponse({ 
			success: true,
			reply: newReply
		}, 201, request);
	}

	// Store a user session when they log in
	async storeSession(username, token, expiresAt) {
		// Get existing sessions
		const sessions = await this.state.storage.get("sessions") || {};
		
		// Update or add the session
		sessions[username] = { token, expiresAt };
		
		// Store updated sessions
		await this.state.storage.put("sessions", sessions);
	}

	// Handle request to store a session
	async storeSessionRequest(request) {
		try {
			const { username, token, expiresAt } = await request.json();
			await this.storeSession(username, token, expiresAt);
			return this.corsResponse({ success: true }, 200, request);
		} catch (error) {
			console.error('Error storing session:', error);
			return this.corsResponse({ error: error.message }, 500, request);
		}
	}
}
