import { DurableObject } from "cloudflare:workers";
import { handleCorsPreflightRequest } from "./utils/cors.js";
import { handleLogin, handleRegister, handleValidate, handleLogout } from "./handlers/auth-handlers.js";
import { handleGetThreads, handleCreateThread, handleCreateReply, handleDeleteThread, handlePurgeAllThreads } from "./handlers/forum-handlers.js";
import { UsersObject } from "./auth/users-object.js";
import { ForumObject } from "./forum/forum-object.js";

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
 * @property {DurableObjectNamespace} USERS - The Users Durable Object namespace binding
 * @property {DurableObjectNamespace} FORUM - The Forum Durable Object namespace binding
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

// Export the Durable Object classes
export { UsersObject, ForumObject };

// Main Worker entry point for authentication and forum API
export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const path = url.pathname;
		const origin = request.headers.get('Origin');

		// Handle CORS preflight requests
		if (request.method === 'OPTIONS') {
			return handleCorsPreflightRequest(request);
		}

		console.log(`Request path: ${path}, method: ${request.method}`);

		// Authentication endpoints
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

		return new Response(JSON.stringify({ error: 'Not found' }), {
			status: 404,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': origin || '*',
				'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			}
		});
	}
};

