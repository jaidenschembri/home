/**
 * CORS utilities for handling cross-origin requests
 */

/**
 * Helper function to generate a JSON response with proper CORS headers
 * @param {Object} data - The data to return in the response
 * @param {number} status - HTTP status code (default: 200)
 * @param {Request} request - The original request object for origin header
 * @returns {Response} Response with JSON data and CORS headers
 */
export function jsonResponse(data, status = 200, request = null) {
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

/**
 * Handle CORS preflight requests
 * @param {Request} request - The OPTIONS request
 * @returns {Response} CORS preflight response
 */
export function handleCorsPreflightRequest(request) {
	const origin = request.headers.get('Origin');
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