import { DurableObject } from "cloudflare:workers";
import { jsonResponse } from "../utils/cors.js";
import { INVITE_CODE } from "../utils/constants.js";

/**
 * UsersObject Durable Object for handling user authentication
 * Each user gets their own instance identified by username
 */
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
		
		// Validate username format
		if (!username || typeof username !== 'string') {
			return this.corsResponse({ 
				error: 'Username is required',
				usernameError: true
			}, 400, request);
		}
		
		// Check username rules: one word, all lowercase letters and numbers only
		const usernameRegex = /^[a-z0-9]+$/;
		if (!usernameRegex.test(username)) {
			return this.corsResponse({ 
				error: 'Username must be one word with only lowercase letters',
				usernameError: true
			}, 400, request);
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