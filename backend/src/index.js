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
function jsonResponse(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': 'https://jaidenschembri.github.io',  // GitHub Pages origin
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

		if (!username || !password) {
			return jsonResponse({ error: 'Username and password are required' }, 400);
		}

		// Get the user Durable Object - we need to use consistent identification
		// During registration we use email, so we should use that same identifier here
		// Since we're passing username in the login form, we'll use that as the key
		const id = env.USERS.idFromName(`user-${username}`);
		const userObj = env.USERS.get(id);

		// Call the login method on the Durable Object
		const response = await userObj.fetch(new URL('/login', request.url).toString(), {
			method: 'POST',
			body: JSON.stringify({ username, password }),
		});

		return response;
	} catch (error) {
		console.error('Login error:', error);
		return jsonResponse({ error: `Login failed: ${error.message}` }, 500);
	}
}

// Registration handler
async function handleRegister(request, env) {
	try {
		const { email, username, password, inviteCode } = await request.json();

		if (!email || !username || !password || !inviteCode) {
			return jsonResponse({ error: 'Email, username, password, and invite code are required' }, 400);
		}
		if (inviteCode !== INVITE_CODE) {
			return jsonResponse({ error: 'Invalid invite code' }, 403);
		}

		// Get the user Durable Object - use username as the consistent identifier
		const id = env.USERS.idFromName(`user-${username}`);
		const userObj = env.USERS.get(id);
		
		// Call the register method on the Durable Object
		const response = await userObj.fetch(new URL('/register', request.url).toString(), {
			method: 'POST',
			body: JSON.stringify({ email, username, password, inviteCode })
		});

		return response;
	} catch (error) {
		console.error('Registration error:', error);
		return jsonResponse({ error: `Registration failed: ${error.message}` }, 500);
	}
}

// Request handler for the Worker
export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const path = url.pathname;

		// Handle CORS preflight requests
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: {
					'Access-Control-Allow-Origin': 'https://jaidenschembri.github.io',
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

		// Default response for unhandled routes
		return jsonResponse({ error: 'Not found' }, 404);
	}
};

// Define the User Durable Object class
export class UsersObject extends DurableObject {
	constructor(state, env) {
		super(state, env);
		this.state = state;
		this.env = env;
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

		if (path === '/register') {
			return this.register(request);
		}

		if (path === '/login') {
			return this.login(request);
		}

		return jsonResponse({ error: 'Not found' }, 404);
	}

	async register(request) {
		const { email, username, password, inviteCode } = await request.json();
		if (!inviteCode || inviteCode !== INVITE_CODE) {
			return jsonResponse({ error: 'Invalid invite code' }, 403);
		}
		// Check if user already exists
		const existingUser = await this.state.storage.get("userData");
		if (existingUser) {
			return jsonResponse({ error: 'User already exists' }, 409);
		}
		// Create and store user data with hashed password
		const hashedPassword = await this.hashPassword(password);
		await this.state.storage.put("userData", {
			email,
			username,
			password: hashedPassword,
			createdAt: new Date().toISOString()
		});
		return jsonResponse({ success: true, message: 'User registered successfully' });
	}

	async login(request) {
		const { username, password } = await request.json();
		// Get user data
		const userData = await this.state.storage.get("userData");
		if (!userData) {
			return jsonResponse({ error: 'User not found' }, 404);
		}
		// Check if username matches (allow login with either username or email)
		if (userData.username !== username && userData.email !== username) {
			return jsonResponse({ error: 'Invalid credentials' }, 401);
		}
		// Check if password matches
		const hashedPassword = await this.hashPassword(password);
		if (userData.password !== hashedPassword) {
			return jsonResponse({ error: 'Invalid credentials' }, 401);
		}
		// Generate a simple token (in a real app, use a proper JWT library)
		const token = crypto.randomUUID();
		// Store the session token
		await this.state.storage.put("session", {
			token,
			username: userData.username,
			expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
		});
		return jsonResponse({
			success: true,
			token,
			user: {
				email: userData.email,
				username: userData.username
			}
		});
	}
}
