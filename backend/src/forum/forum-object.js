import { DurableObject } from "cloudflare:workers";

/**
 * ForumObject Durable Object for handling forum posts and replies
 * Single instance handles all forum data
 */
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
		
		return await this.getUsernameFromToken(token);
	}

	async fetch(request) {
		const url = new URL(request.url);
		const path = url.pathname;
		
		console.log(`ForumObject received request with path: ${path}, method: ${request.method}`);
		
		if (path === '/validate' || path.endsWith('/validate')) {
			return this.validateRequest(request);
		}
		
		if (path === '/threads' || path.endsWith('/threads')) {
			if (request.method === 'GET') {
				return this.getThreads(request);
			}
			if (request.method === 'POST') {
				return this.createThread(request);
			}
		}
		
		// Handle thread-specific operations
		const threadMatch = path.match(/\/threads\/([^\/]+)\/replies$/);
		if (threadMatch && request.method === 'POST') {
			const threadId = threadMatch[1];
			return this.createReply(request, threadId);
		}
		
		// Handle thread deletion
		const deleteThreadMatch = path.match(/\/api\/forum\/posts\/([^\/]+)$/);
		if (deleteThreadMatch && request.method === 'DELETE') {
			const threadId = deleteThreadMatch[1];
			return this.deleteThread(request, threadId);
		}
		
		// Add handler for reply deletion
		const deleteReplyMatch = path.match(/\/api\/forum\/posts\/([^\/]+)\/replies\/([^\/]+)$/);
		if (deleteReplyMatch && request.method === 'DELETE') {
			const threadId = deleteReplyMatch[1];
			const replyId = deleteReplyMatch[2];
			console.log('ForumObject handling reply deletion:', { threadId, replyId });
			return this.deleteReply(request, threadId, replyId);
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
		
		// Sanitize threads to ensure all fields are proper strings
		const sanitizedThreads = threads.map(thread => ({
			...thread,
			username: thread.username || 'anonymous',
			content: thread.content || '',
			subject: thread.subject || '',
			replies: (thread.replies || []).map(reply => ({
				...reply,
				username: reply.username || 'anonymous',
				content: reply.content || ''
			}))
		}));
		
		return this.corsResponse({ threads: sanitizedThreads }, 200, request);
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
							// Validate image size - increased limit but still reasonable for SQLite
							const MAX_SIZE = 10 * 1024 * 1024; // 10MB max (will be compressed)
							if (imageFile.size > MAX_SIZE) {
								return this.corsResponse({ 
									error: 'Image file too large. Maximum size is 10MB.',
									details: `File size: ${(imageFile.size / 1024 / 1024).toFixed(2)}MB, Max: 10MB`
								}, 400, request);
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
								
								// Check if the base64 image is too large for efficient storage
								const MAX_BASE64_SIZE = 8 * 1024 * 1024; // 8MB base64 limit (more generous)
								if (imageData.length > MAX_BASE64_SIZE) {
									// Instead of rejecting, we'll truncate or provide a helpful message
									console.warn(`Image size ${imageSizeKB}KB exceeds optimal size, but proceeding...`);
									
									// For very large images, we could implement compression here
									// For now, we'll allow it but warn about potential storage issues
									if (imageData.length > 12 * 1024 * 1024) { // 12MB absolute limit
										return this.corsResponse({ 
											error: 'Processed image too large for storage.',
											details: `Processed size: ${imageSizeKB}KB. Please try compressing the image or using a smaller file.`,
											suggestion: 'Try using an online image compressor or reducing image quality before uploading.'
										}, 400, request);
									}
								}
								
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
				content: content || '', // Ensure content is always a string
				username: username || 'anonymous', // Ensure username is always a string
				timestamp: new Date().toISOString(),
				imageUrl: imageData,
				replies: []
			};
			
			// Add to beginning of threads array
			threads.unshift(newThread);
			
			// Check total storage size before saving
			const threadsJson = JSON.stringify(threads);
			const sizeKB = (threadsJson.length / 1024).toFixed(2);
			console.log(`Total threads storage size: ${sizeKB}KB`);
			
			// SQLite has a practical limit around 1MB per value, but we can be more generous
			const MAX_STORAGE_SIZE = 2 * 1024 * 1024; // 2MB total storage limit (increased from 800KB)
			if (threadsJson.length > MAX_STORAGE_SIZE) {
				return this.corsResponse({ 
					error: 'Storage limit exceeded. Please try with a smaller image or contact admin.',
					details: `Storage size: ${sizeKB}KB, Max: ${(MAX_STORAGE_SIZE / 1024).toFixed(0)}KB`,
					suggestion: 'Consider compressing images or removing old posts to free up space.'
				}, 400, request);
			}
			
			// Store updated threads
			try {
				await this.state.storage.put("threads", threads);
				console.log(`Thread ${threadId} created successfully`);
				
				return this.corsResponse({ 
					success: true,
					thread: newThread
				}, 201, request);
			} catch (storageError) {
				console.error('Error storing thread:', storageError);
				
				// Handle specific SQLite errors
				if (storageError.message && storageError.message.includes('SQLITE_TOOBIG')) {
					return this.corsResponse({ 
						error: 'Data too large for storage. Please use a smaller image.',
						details: 'SQLite storage limit exceeded',
						phase: 'storage'
					}, 400, request);
				}
				
				return this.corsResponse({ 
					error: 'Error storing thread',
					details: storageError.message,
					phase: 'storage'
				}, 500, request);
			}
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
							// Validate image size - increased limit but still reasonable for SQLite
							const MAX_SIZE = 10 * 1024 * 1024; // 10MB max (will be compressed)
							if (imageFile.size > MAX_SIZE) {
								return this.corsResponse({ 
									error: 'Image file too large. Maximum size is 10MB.',
									details: `File size: ${(imageFile.size / 1024 / 1024).toFixed(2)}MB, Max: 10MB`
								}, 400, request);
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
								
								// Check if the base64 image is too large for efficient storage
								const MAX_BASE64_SIZE = 8 * 1024 * 1024; // 8MB base64 limit (more generous)
								if (imageData.length > MAX_BASE64_SIZE) {
									// Instead of rejecting, we'll truncate or provide a helpful message
									console.warn(`Image size ${imageSizeKB}KB exceeds optimal size, but proceeding...`);
									
									// For very large images, we could implement compression here
									// For now, we'll allow it but warn about potential storage issues
									if (imageData.length > 12 * 1024 * 1024) { // 12MB absolute limit
										return this.corsResponse({ 
											error: 'Processed image too large for storage.',
											details: `Processed size: ${imageSizeKB}KB. Please try compressing the image or using a smaller file.`,
											suggestion: 'Try using an online image compressor or reducing image quality before uploading.'
										}, 400, request);
									}
								}
								
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
				content: content || '', // Ensure content is always a string
				username: username || 'anonymous', // Ensure username is always a string
				timestamp: new Date().toISOString(),
				imageUrl: imageData
			};
			
			// Initialize replies array if it doesn't exist
			if (!threads[threadIndex].replies) {
				threads[threadIndex].replies = [];
			}
			
			// Add reply to the thread
			threads[threadIndex].replies.push(newReply);
			
			// Check total storage size before saving
			const threadsJson = JSON.stringify(threads);
			const sizeKB = (threadsJson.length / 1024).toFixed(2);
			console.log(`Total threads storage size after reply: ${sizeKB}KB`);
			
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
				
				// Handle specific SQLite errors
				if (storageError.message && storageError.message.includes('SQLITE_TOOBIG')) {
					return this.corsResponse({ 
						error: 'Data too large for storage. Please use a smaller image.',
						details: 'SQLite storage limit exceeded',
						phase: 'storage'
					}, 400, request);
				}
				
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

	// Delete a specific reply (admin only)
	async deleteReply(request, threadId, replyId) {
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
		
		// Find the thread to delete the reply from
		const threadIndex = threads.findIndex(t => t.id === threadId);
		if (threadIndex === -1) {
			return this.corsResponse({ error: 'Thread not found' }, 404, request);
		}
		
		// Find the reply to delete
		const replyIndex = threads[threadIndex].replies.findIndex(r => r.id === replyId);
		if (replyIndex === -1) {
			return this.corsResponse({ error: 'Reply not found' }, 404, request);
		}
		
		// Remove the reply from the thread
		threads[threadIndex].replies.splice(replyIndex, 1);
		
		// Store updated threads
		await this.state.storage.put("threads", threads);
		
		return this.corsResponse({ 
			success: true,
			message: 'Reply deleted successfully'
		}, 200, request);
	}
} 