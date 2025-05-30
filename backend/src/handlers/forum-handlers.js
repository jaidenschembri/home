import { jsonResponse } from "../utils/cors.js";

// Forum threads handler - Get all threads
export async function handleGetThreads(request, env) {
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
export async function handleCreateThread(request, env) {
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
export async function handleCreateReply(request, env, threadId) {
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
export async function handleDeleteThread(request, env, threadId) {
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
export async function handlePurgeAllThreads(request, env) {
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
		doURL.pathname = "/api/forum/posts/purge";
		
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
		console.error('Purge all threads error:', error);
		return jsonResponse({ error: `Failed to purge threads: ${error.message}` }, 500, request);
	}
} 