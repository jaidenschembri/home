import { jsonResponse } from "../utils/cors.js";

// Login handler
export async function handleLogin(request, env) {
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
export async function handleRegister(request, env) {
	try {
		const { email, username, password, inviteCode } = await request.json();
		console.log(`Attempting registration for user: ${username}, email: ${email}`);

		if (!email || !username || !password || !inviteCode) {
			return jsonResponse({ error: 'Email, username, password, and invite code are required' }, 400, request);
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

// Validate token handler
export async function handleValidate(request, env) {
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

// Logout handler to invalidate token
export async function handleLogout(request, env) {
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