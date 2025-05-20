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

		console.log(`Request path: ${path}, method: ${request.method}`);

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
		
		if (path === '/api/logout' && request.method === 'POST') {
			return handleLogout(request, env);
		}

		// Forum endpoints
		if (path.startsWith('/api/forum/posts')) {
			const forumId = env.FORUM.idFromName('forum-data');
			const forum = env.FORUM.get(forumId);
			
			// Extract thread ID and reply ID from URL if present
			const matches = path.match(/\/api\/forum\/posts\/([^\/]+)(?:\/replies(?:\/([^\/]+))?)?/);
			const threadId = matches?.[1];
			const replyId = matches?.[2];
			
			console.log('Path matches:', { threadId, replyId, path });
			
			if (request.method === 'GET') {
				return handleGetThreads(request, env);
			}
			
			if (request.method === 'POST') {
				if (threadId && path.endsWith('/replies')) {
					console.log('Handling reply creation for thread:', threadId);
					return handleCreateReply(request, env, threadId);
				}
				return handleCreateThread(request, env);
			}
			
			if (request.method === 'DELETE') {
				if (threadId && replyId) {
					// Forward the request to the forum object for reply deletion
					console.log('Handling reply deletion:', { threadId, replyId });
					return forum.fetch(request.url, {
						method: 'DELETE',
						headers: request.headers
					});
				}
				if (path === '/api/forum/posts/purge') {
					return handlePurgeAllThreads(request, env);
				}
				if (threadId) {
					return handleDeleteThread(request, env, threadId);
				}
			}
		}

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
		
		// Get the session
		const session = await env.USERS.get(env.USERS.idFromName(`user-${token.split('-')[0] || 'unknown'}`)).storage.get("session");
		if (!session || session.token !== token) {
			return jsonResponse({ valid: false }, 401, request);
		}
		
		// Check if token is expired
		const expiresAt = new Date(session.expiresAt);
		const now = new Date();
		
		// If token is about to expire (within 24 hours), extend it
		if (expiresAt.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
			// Extend the session by 30 days
			const newExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
			session.expiresAt = newExpiresAt.toISOString();
			await env.USERS.get(env.USERS.idFromName(`user-${token.split('-')[0] || 'unknown'}`)).storage.put("session", session);
		}
		
		// Get user data
		const userData = await env.USERS.get(env.USERS.idFromName(`user-${token.split('-')[0] || 'unknown'}`)).storage.get("userData");
		if (!userData) {
			return jsonResponse({ valid: false, error: 'User not found' }, 404, request);
		}
		
		// Token is valid
		return jsonResponse({
			valid: true,
			user: {
				username: userData.username,
				email: userData.email
			}
		}, 200, request);
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
		
		// Clone the request with all headers and body to forward to the Durable Object
		const clonedRequest = new Request(doURL.toString(), {
			method: 'POST',
			headers: request.headers,
			body: await request.arrayBuffer() // Use arrayBuffer to properly handle binary data
		});
		
		// Call the createThread method on the Durable Object
		const response = await forumObj.fetch(clonedRequest);
		
		if (!response.ok) {
			console.error('Error from Durable Object:', await response.clone().text());
		}
		
		return response;
	} catch (error) {
		console.error('Create thread error:', error);
		return jsonResponse({ 
			error: 'Failed to create thread',
			details: error.message
		}, 500, request);
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
		
		console.log(`Creating reply for thread ${threadId}`);
		
		// Get the forum Durable Object
		const id = env.FORUM.idFromName('forum-data');
		const forumObj = env.FORUM.get(id);
		
		// Use the proper absolute URL for Durable Object
		const requestURL = new URL(request.url);
		const doURL = new URL(requestURL.origin);
		doURL.pathname = `/threads/${threadId}/replies`;
		
		console.log('Forwarding reply creation to Durable Object with URL:', doURL.toString());
		
		// Clone the request with all headers and body to forward to the Durable Object
		const clonedRequest = new Request(doURL.toString(), {
			method: 'POST',
			headers: request.headers,
			body: await request.arrayBuffer() // Use arrayBuffer to properly handle binary data
		});
		
		// Call the createReply method on the Durable Object
		const response = await forumObj.fetch(clonedRequest);
		
		if (!response.ok) {
			const errorText = await response.clone().text();
			console.error('Error from Durable Object:', errorText);
			try {
				const errorJson = JSON.parse(errorText);
				return jsonResponse(errorJson, response.status, request);
			} catch (e) {
				return jsonResponse({ 
					error: 'Error processing reply',
					details: errorText
				}, response.status, request);
			}
		}
		
		return response;
	} catch (error) {
		console.error('Create reply error:', error);
		return jsonResponse({ 
			error: 'Failed to create reply',
			details: error.message,
			phase: 'request_handling'
		}, 500, request);
	}
}

// Handle deletion of a thread (admin only)
async function handleDeleteThread(request, env, threadId) {
	try {
		// Check for authentication
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return jsonResponse({ error: 'Authentication required' }, 401, request);
		}
		
		console.log(`Processing thread deletion for ID: ${threadId}`);
		
		// Get the forum Durable Object
		const id = env.FORUM.idFromName('forum-data');
		const forumObj = env.FORUM.get(id);
		
		// Use the proper absolute URL for Durable Object
		const requestURL = new URL(request.url);
		const doURL = new URL(requestURL.origin);
		doURL.pathname = `/api/forum/posts/${threadId}`;
		
		console.log(`Forwarding to Durable Object URL: ${doURL.toString()}`);
		
		// Forward the headers to the Durable Object
		const headers = new Headers();
		headers.set('Authorization', authHeader);
		if (request.headers.has('Origin')) {
			headers.set('Origin', request.headers.get('Origin'));
		}
		
		// Call the deleteThread method on the Durable Object
		const response = await forumObj.fetch(doURL.toString(), {
			method: 'DELETE',
			headers
		});
		
		const responseClone = response.clone();
		try {
			const responseData = await response.json();
			console.log(`Durable Object deleteThread response:`, responseData);
			return new Response(JSON.stringify(responseData), {
				status: response.status,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
					'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				},
			});
		} catch (e) {
			console.error('Error parsing JSON from Durable Object:', e);
			const text = await responseClone.text();
			console.log('Raw response text:', text);
			return jsonResponse({ error: 'Internal server error' }, 500, request);
		}
	} catch (error) {
		console.error('Delete thread error:', error);
		return jsonResponse({ error: `Failed to delete thread: ${error.message}` }, 500, request);
	}
}

// Handle purging all threads (admin only)
async function handlePurgeAllThreads(request, env) {
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
		doURL.pathname = "/threads/purge";
		
		// Forward the headers to the Durable Object
		const headers = new Headers();
		headers.set('Authorization', authHeader);
		if (request.headers.has('Origin')) {
			headers.set('Origin', request.headers.get('Origin'));
		}
		
		// Call the purgeAllThreads method on the Durable Object
		const response = await forumObj.fetch(doURL.toString(), {
			method: 'DELETE',
			headers
		});
		
		return response;
	} catch (error) {
		console.error('Purge threads error:', error);
		return jsonResponse({ error: `Failed to purge threads: ${error.message}` }, 500, request);
	}
}

// Add this new handler function
async function handleDeleteReply(request, env, threadId, replyId) {
	const forumId = env.FORUM.idFromName('forum');
	const forum = env.FORUM.get(forumId);
	
	const url = new URL(request.url);
	url.pathname = `/api/forum/posts/${threadId}/replies/${replyId}`;
	
	return forum.fetch(url.toString(), {
		method: 'DELETE',
		headers: request.headers
	});
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
		
		if (path === '/logout' || path.endsWith('/logout')) {
			return this.logout(request);
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
		const now = new Date();
		
		// If token is about to expire (within 24 hours), extend it
		if (expiresAt.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
			// Extend the session by 30 days
			const newExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
			session.expiresAt = newExpiresAt.toISOString();
			await this.state.storage.put("session", session);
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
		const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
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

	// Logout the user by invalidating their token
	async logout(request) {
		// Get the token from the Authorization header
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return this.corsResponse({ success: false, error: 'Invalid token' }, 401, request);
		}
		
		const token = authHeader.split(' ')[1];
		if (!token) {
			return this.corsResponse({ success: false, error: 'Invalid token' }, 401, request);
		}
		
		// Get the session
		const session = await this.state.storage.get("session");
		if (!session || session.token !== token) {
			// Token not found or doesn't match, but we'll consider this a successful logout
			return this.corsResponse({ success: true }, 200, request);
		}
		
		// Delete the session
		await this.state.storage.delete("session");
		
		return this.corsResponse({ success: true }, 200, request);
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
		
		console.log(`ForumObject received request with path: ${path}, method: ${request.method}`);
		
		// Extract thread ID and reply ID from URL if present
		const threadMatch = path.match(/\/threads\/([^\/]+)\/replies/);
		const threadId = threadMatch?.[1];
		
		if (threadMatch && request.method === 'POST') {
			console.log('ForumObject handling reply creation for thread:', threadId);
			return this.createReply(request, threadId);
		}
		
		// Handle DELETE request for a thread
		if (path === '/validate' || path.endsWith('/validate')) {
			return this.validateRequest(request);
		}
		
		if (path === '/logout' || path.endsWith('/logout')) {
			return this.logoutRequest(request);
		}
		
		if (path === '/threads' || path.endsWith('/threads') || path === '/api/forum/posts') {
			if (request.method === 'GET') {
				return this.getThreads(request);
			} else if (request.method === 'POST') {
				return this.createThread(request);
			}
		}
		
		// Add handler for thread deletion
		const deleteThreadMatch = path.match(/\/api\/forum\/posts\/([^\/]+)$/);
		if (deleteThreadMatch && request.method === 'DELETE') {
			const threadId = deleteThreadMatch[1];
			console.log('ForumObject handling thread deletion:', threadId);
			return this.deleteThread(request, threadId);
		}
		
		if (path === '/store-session' || path.endsWith('/store-session')) {
			return this.storeSessionRequest(request);
		}
		
		if ((path === '/api/forum/posts/purge' || path.endsWith('/posts/purge')) && request.method === 'DELETE') {
			return this.purgeAllThreads(request);
		}
		
		console.log(`ForumObject: No handler matched for path: ${path}, method: ${request.method}`);
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
		
		try {
			// Check if we have a multipart form-data request (with image)
			const contentType = request.headers.get('Content-Type') || '';
			console.log('Request Content-Type:', contentType);
			
			let subject = '';
			let content = '';
			let imageData = null;
			
			if (contentType.includes('multipart/form-data')) {
				try {
					// Handle multipart form data with image attachment
					console.log('Processing multipart form data...');
					const formData = await request.formData();
					
					subject = formData.get('subject') || '';
					content = formData.get('content') || '';
					console.log('Content length:', content.length);
					
					// Get the image file
					const imageFile = formData.get('image');
					if (imageFile) {
						console.log('Image file details:', {
							name: imageFile.name,
							type: imageFile.type,
							size: imageFile.size
						});
						
						if (imageFile.size > 0) {
							// Validate image size (100MB max)
							const MAX_SIZE = 100 * 1024 * 1024; // 100MB (practically unlimited for forum images)
							if (imageFile.size > MAX_SIZE) {
								return this.corsResponse({ error: 'Image file too large. Maximum size is 100MB.' }, 400, request);
							}
							
							// Validate image type
							if (!imageFile.type.startsWith('image/')) {
								return this.corsResponse({ error: 'Invalid file type. Only images are allowed.' }, 400, request);
							}
							
							try {
								// Get the image data as an ArrayBuffer
								const imageBuffer = await imageFile.arrayBuffer();
								console.log('Image buffer size:', imageBuffer.byteLength);
								
								// Convert to base64 in chunks
								const base64Image = this.arrayBufferToBase64(imageBuffer);
								console.log('Base64 conversion successful');
								
								// Create a data URL for the image
								const mimeType = imageFile.type || 'image/jpeg';
								imageData = `data:${mimeType};base64,${base64Image}`;
								
								const imageSizeKB = (imageData.length / 1024).toFixed(2);
								console.log(`Image processed successfully, final size: ${imageSizeKB}KB`);
								
								// Verify the data URL is valid
								if (!imageData.startsWith('data:image/')) {
									throw new Error('Invalid image data URL format');
								}
							} catch (imageError) {
								console.error('Error processing image:', imageError);
								return this.corsResponse({ 
									error: 'Error processing image',
									details: imageError.message,
									phase: 'image_processing'
								}, 400, request);
							}
						}
					}
				} catch (formError) {
					console.error('Error parsing form data:', formError);
					return this.corsResponse({ 
						error: 'Error parsing form data',
						details: formError.message,
						phase: 'form_parsing'
					}, 400, request);
				}
			} else {
				try {
					// Regular JSON request without image
					console.log('Processing JSON request...');
					const body = await request.json();
					subject = body.subject || '';
					content = body.content || '';
					console.log('Content length:', content.length);
				} catch (jsonError) {
					console.error('Error parsing JSON:', jsonError);
					return this.corsResponse({ 
						error: 'Error parsing JSON data',
						details: jsonError.message,
						phase: 'json_parsing'
					}, 400, request);
				}
			}
			
			// Allow empty content if an image is provided
			if ((!content || content.trim() === '') && !imageData) {
				return this.corsResponse({ error: 'Thread content or image is required' }, 400, request);
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
				imageUrl: imageData,
				replies: []
			};
			
			// Add to beginning of threads array
			threads.unshift(newThread);
			
			// Store updated threads
			await this.state.storage.put("threads", threads);
			
			console.log(`Thread ${threadId} created successfully`);
			
			return this.corsResponse({ 
				success: true,
				thread: newThread
			}, 201, request);
		} catch (error) {
			console.error('Error handling thread creation:', error);
			return this.corsResponse({ 
				error: 'Internal server error',
				details: error.message,
				phase: 'general'
			}, 500, request);
		}
	}

	// Helper function to convert ArrayBuffer to base64 in chunks
	arrayBufferToBase64(buffer) {
		let binary = '';
		const bytes = new Uint8Array(buffer);
		const chunkSize = 1024; // Process 1KB at a time
		
		for (let i = 0; i < bytes.length; i += chunkSize) {
			const chunk = bytes.slice(i, i + chunkSize);
			chunk.forEach(b => binary += String.fromCharCode(b));
		}
		
		return btoa(binary);
	}

	// Create a reply to a thread
	async createReply(request, threadId) {
		try {
			const username = await this.validateToken(request);
			if (!username) {
				return this.corsResponse({ error: 'Authentication required' }, 401, request);
			}
			
			console.log(`Creating reply for thread ${threadId} by user ${username}`);
			
			// Check if we have a multipart form-data request (with image)
			const contentType = request.headers.get('Content-Type') || '';
			console.log('Request Content-Type:', contentType);
			
			let content = '';
			let imageData = null;
			
			if (contentType.includes('multipart/form-data')) {
				try {
					// Handle multipart form data with image attachment
					console.log('Processing multipart form data...');
					const formData = await request.formData();
					
					content = formData.get('content') || '';
					console.log('Content length:', content.length);
					
					// Get the image file
					const imageFile = formData.get('image');
					if (imageFile) {
						console.log('Image file details:', {
							name: imageFile.name,
							type: imageFile.type,
							size: imageFile.size
						});
						
						if (imageFile.size > 0) {
							// Validate image size (100MB max)
							const MAX_SIZE = 100 * 1024 * 1024; // 100MB (practically unlimited for forum images)
							if (imageFile.size > MAX_SIZE) {
								return this.corsResponse({ error: 'Image file too large. Maximum size is 100MB.' }, 400, request);
							}
							
							// Validate image type
							if (!imageFile.type.startsWith('image/')) {
								return this.corsResponse({ error: 'Invalid file type. Only images are allowed.' }, 400, request);
							}
							
							try {
								// Get the image data as an ArrayBuffer
								const imageBuffer = await imageFile.arrayBuffer();
								console.log('Image buffer size:', imageBuffer.byteLength);
								
								// Convert to base64 in chunks
								const base64Image = this.arrayBufferToBase64(imageBuffer);
								console.log('Base64 conversion successful');
								
								// Create a data URL for the image
								const mimeType = imageFile.type || 'image/jpeg';
								imageData = `data:${mimeType};base64,${base64Image}`;
								
								const imageSizeKB = (imageData.length / 1024).toFixed(2);
								console.log(`Image processed successfully, final size: ${imageSizeKB}KB`);
								
								// Verify the data URL is valid
								if (!imageData.startsWith('data:image/')) {
									throw new Error('Invalid image data URL format');
								}
							} catch (imageError) {
								console.error('Error processing image:', imageError);
								return this.corsResponse({ 
									error: 'Error processing image',
									details: imageError.message,
									phase: 'image_processing'
								}, 400, request);
							}
						}
					}
				} catch (formError) {
					console.error('Error parsing form data:', formError);
					return this.corsResponse({ 
						error: 'Error parsing form data',
						details: formError.message,
						phase: 'form_parsing'
					}, 400, request);
				}
			} else {
				try {
					// Regular JSON request without image
					console.log('Processing JSON request...');
					const body = await request.json();
					content = body.content || '';
					console.log('Content length:', content.length);
				} catch (jsonError) {
					console.error('Error parsing JSON:', jsonError);
					return this.corsResponse({ 
						error: 'Error parsing JSON data',
						details: jsonError.message,
						phase: 'json_parsing'
					}, 400, request);
				}
			}
			
			// Allow empty content if an image is provided
			if ((!content || content.trim() === '') && !imageData) {
				return this.corsResponse({ error: 'Reply content or image is required' }, 400, request);
			}
			
			// Get existing threads
			const threads = await this.state.storage.get("threads") || [];
			
			// Find the thread to reply to
			const threadIndex = threads.findIndex(t => t.id === threadId);
			if (threadIndex === -1) {
				console.error(`Thread ${threadId} not found`);
				return this.corsResponse({ error: 'Thread not found' }, 404, request);
			}
			
			// Create new reply
			const replyId = Date.now().toString(); // Simple ID generation
			const newReply = {
				id: replyId,
				content,
				username,
				timestamp: new Date().toISOString(),
				imageUrl: imageData
			};
			
			// Initialize replies array if it doesn't exist
			if (!threads[threadIndex].replies) {
				threads[threadIndex].replies = [];
			}
			
			// Add reply to the thread
			threads[threadIndex].replies.push(newReply);
			
			// Store updated threads
			try {
				await this.state.storage.put("threads", threads);
				console.log(`Reply ${replyId} created successfully for thread ${threadId}`);
				
				return this.corsResponse({ 
					success: true,
					reply: newReply
				}, 201, request);
			} catch (storageError) {
				console.error('Error storing reply:', storageError);
				return this.corsResponse({ 
					error: 'Error storing reply',
					details: storageError.message,
					phase: 'storage'
				}, 500, request);
			}
		} catch (error) {
			console.error('Error handling reply creation:', error);
			return this.corsResponse({ 
				error: 'Internal server error',
				details: error.message,
				phase: 'general'
			}, 500, request);
		}
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

	// Delete a specific thread (admin only)
	async deleteThread(request, threadId) {
		const username = await this.validateToken(request);
		if (!username) {
			return this.corsResponse({ error: 'Authentication required' }, 401, request);
		}
		
		// Check if user is an admin
		if (username !== 'admin') {
			return this.corsResponse({ error: 'Admin privileges required' }, 403, request);
		}
		
		// Get existing threads
		const threads = await this.state.storage.get("threads") || [];
		
		// Find the thread to delete
		const threadIndex = threads.findIndex(t => t.id === threadId);
		if (threadIndex === -1) {
			return this.corsResponse({ error: 'Thread not found' }, 404, request);
		}
		
		// Remove the thread
		threads.splice(threadIndex, 1);
		
		// Store updated threads
		await this.state.storage.put("threads", threads);
		
		return this.corsResponse({ 
			success: true,
			message: 'Thread deleted successfully'
		}, 200, request);
	}
	
	// Purge all threads (admin only)
	async purgeAllThreads(request) {
		const username = await this.validateToken(request);
		if (!username) {
			return this.corsResponse({ error: 'Authentication required' }, 401, request);
		}
		
		// Check if user is an admin
		if (username !== 'admin') {
			return this.corsResponse({ error: 'Admin privileges required' }, 403, request);
		}
		
		// Delete all threads
		await this.state.storage.delete("threads");
		
		return this.corsResponse({ 
			success: true,
			message: 'All threads purged successfully'
		}, 200, request);
	}

	// Logout the user by invalidating their token
	async logoutRequest(request) {
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return this.corsResponse({ success: false, error: 'Invalid token' }, 401, request);
		}
		
		const token = authHeader.split(' ')[1];
		if (!token) {
			return this.corsResponse({ success: false, error: 'Invalid token' }, 401, request);
		}
		
		// Get all sessions
		const sessions = await this.state.storage.get("sessions") || {};
		let userFound = false;
		
		// Find and remove the session with the matching token
		for (const [username, sessionData] of Object.entries(sessions)) {
			if (sessionData.token === token) {
				console.log(`Removing session for user: ${username}`);
				delete sessions[username];
				userFound = true;
				break;
			}
		}
		
		// Store updated sessions
		if (userFound) {
			await this.state.storage.put("sessions", sessions);
		}
		
		return this.corsResponse({ success: true }, 200, request);
	}
}

// Logout handler to invalidate token
async function handleLogout(request, env) {
	try {
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return jsonResponse({ success: false, error: 'No valid token provided' }, 400, request);
		}
		
		const token = authHeader.split(' ')[1];
		if (!token) {
			return jsonResponse({ success: false, error: 'No valid token provided' }, 400, request);
		}
		
		// Try to get username from forum sessions first
		const forumId = env.FORUM.idFromName('forum-data');
		const forumObj = env.FORUM.get(forumId);
		
		// Use the proper absolute URL for Durable Object
		const requestURL = new URL(request.url);
		const doURL = new URL(requestURL.origin);
		doURL.pathname = "/logout";
		
		// Forward the Authorization header to the Durable Object
		const headers = new Headers();
		headers.set('Authorization', authHeader);
		if (request.headers.has('Origin')) {
			headers.set('Origin', request.headers.get('Origin'));
		}
		
		// Log out from the Forum Object
		try {
			await forumObj.fetch(doURL.toString(), {
				method: 'POST',
				headers
			});
		} catch (error) {
			console.error('Error logging out from forum object:', error);
			// Continue anyway to try other objects
		}
		
		// Also try to find and logout the specific user object
		// Extract a username from the token (hacky, but useful for demo)
		const possibleUsername = token.split('-')[0];
		if (possibleUsername) {
			try {
				const userId = env.USERS.idFromName(`user-${possibleUsername}`);
				const userObj = env.USERS.get(userId);
				
				const userLogoutURL = new URL(requestURL.origin);
				userLogoutURL.pathname = "/logout";
				
				await userObj.fetch(userLogoutURL.toString(), {
					method: 'POST',
					headers
				});
			} catch (error) {
				console.error(`Error logging out user ${possibleUsername}:`, error);
				// Proceed anyway
			}
		}
		
		// Return success regardless - it's just a client-side logout
		return jsonResponse({ success: true }, 200, request);
	} catch (error) {
		console.error('Logout error:', error);
		// Even with errors, consider the logout successful from the client perspective
		return jsonResponse({ success: true }, 200, request);
	}
}
