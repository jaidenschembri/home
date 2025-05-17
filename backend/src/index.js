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

		// Forum API endpoints
		if (path === '/api/forum/posts' && request.method === 'GET') {
			return handleGetPosts(request, env);
		}

		if (path === '/api/forum/posts' && request.method === 'POST') {
			return handleCreatePost(request, env);
		}

		// Default response for unhandled routes
		return jsonResponse({ error: 'Not found' }, 404, request);
	}
};

// Forum posts handler - Get all posts
async function handleGetPosts(request, env) {
	try {
		// Get the forum Durable Object
		const id = env.FORUM.idFromName('forum-posts');
		const forumObj = env.FORUM.get(id);
		
		// Use the proper absolute URL for Durable Object
		const requestURL = new URL(request.url);
		const doURL = new URL(requestURL.origin);
		doURL.pathname = "/posts";
		
		// Forward the Origin header to the Durable Object
		const headers = new Headers();
		if (request.headers.has('Origin')) {
			headers.set('Origin', request.headers.get('Origin'));
		}
		
		// Call the getPosts method on the Durable Object
		const response = await forumObj.fetch(doURL.toString(), {
			method: 'GET',
			headers
		});
		
		return response;
	} catch (error) {
		console.error('Get posts error:', error);
		return jsonResponse({ error: `Failed to get posts: ${error.message}` }, 500, request);
	}
}

// Forum posts handler - Create a new post
async function handleCreatePost(request, env) {
	try {
		// Check for authentication
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return jsonResponse({ error: 'Authentication required' }, 401, request);
		}
		
		const token = authHeader.split(' ')[1];
		if (!token) {
			return jsonResponse({ error: 'Invalid token format' }, 401, request);
		}
		
		// Validate the post data
		const { content } = await request.json();
		if (!content || content.trim() === '') {
			return jsonResponse({ error: 'Post content is required' }, 400, request);
		}
		
		// Get the forum Durable Object
		const id = env.FORUM.idFromName('forum-posts');
		const forumObj = env.FORUM.get(id);
		
		// Use the proper absolute URL for Durable Object
		const requestURL = new URL(request.url);
		const doURL = new URL(requestURL.origin);
		doURL.pathname = "/posts";
		
		// Forward the Origin header to the Durable Object
		const headers = new Headers(request.headers);
		
		// Call the createPost method on the Durable Object
		const response = await forumObj.fetch(doURL.toString(), {
			method: 'POST',
			headers,
			body: JSON.stringify({ content, token })
		});
		
		return response;
	} catch (error) {
		console.error('Create post error:', error);
		return jsonResponse({ error: `Failed to create post: ${error.message}` }, 500, request);
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

		console.log(`Path not matched: ${path}`);
		return jsonResponse({ error: `Not found: ${path}` }, 404, request);
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
		await this.state.storage.put("session", {
			token,
			username: userData.username,
			expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
		});
		
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

	// Get the username from a token
	async getUsernameFromToken(token) {
		// We need to find which user has this token
		// This is not efficient, but for our simple app it's ok
		const userIdsKey = "userIds";
		let userIds = await this.state.storage.get(userIdsKey) || [];

		// Iterate through each user to find the token
		for (const userId of userIds) {
			const userObjId = this.env.USERS.idFromName(userId);
			const userObj = this.env.USERS.get(userObjId);
			
			try {
				const url = new URL(request.url);
				url.pathname = "/validate";
				
				const response = await userObj.fetch(url.toString(), {
					method: 'POST',
					headers: request.headers,
					body: JSON.stringify({ token })
				});
				
				const data = await response.json();
				if (data.valid && data.user) {
					return data.user.username;
				}
			} catch (error) {
				console.error(`Error validating token for ${userId}:`, error);
			}
		}
		
		return null;
	}

	async fetch(request) {
		const url = new URL(request.url);
		const path = url.pathname;
		
		if (path === '/posts' || path.endsWith('/posts')) {
			if (request.method === 'GET') {
				return this.getPosts(request);
			} else if (request.method === 'POST') {
				return this.createPost(request);
			}
		}
		
		return this.corsResponse({ error: `Not found: ${path}` }, 404, request);
	}

	async getPosts(request) {
		// Get all posts from storage
		const posts = await this.state.storage.get("posts") || [];
		return this.corsResponse({ posts }, 200, request);
	}

	async createPost(request) {
		const { content, token } = await request.json();
		let username = "Anonymous";
		
		// Try to get the username from the token
		const authHeader = request.headers.get('Authorization');
		if (authHeader && authHeader.startsWith('Bearer ')) {
			const authToken = authHeader.split(' ')[1];
			// For simplicity, we'll use a dummy username based on token
			// In a real app, you would validate this token properly
			username = authToken.substring(0, 8) + "...";
		}
		
		// Get existing posts
		const posts = await this.state.storage.get("posts") || [];
		
		// Create new post
		const newPost = {
			id: crypto.randomUUID(),
			content,
			username,
			timestamp: new Date().toISOString()
		};
		
		// Add to beginning of posts array
		posts.unshift(newPost);
		
		// Store updated posts
		await this.state.storage.put("posts", posts);
		
		return this.corsResponse({ 
			success: true,
			post: newPost
		}, 201, request);
	}
}
