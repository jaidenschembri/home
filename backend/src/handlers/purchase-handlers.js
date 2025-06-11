import { jsonResponse } from '../utils/cors.js';

/**
 * Handle recording a purchase after successful PayPal payment
 * @param {Request} request 
 * @param {*} env 
 * @returns {Response}
 */
export async function handleRecordPurchase(request, env) {
    try {
        // Verify authentication first
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            console.log('❌ No authorization token provided');
            return jsonResponse({ 
                success: false, 
                error: 'Authorization required' 
            }, 401, request);
        }

        const token = authHeader.split(' ')[1];
        
        // Validate token using the forum object (like in auth-handlers.js)
        const forumId = env.FORUM.idFromName('forum-data');
        const forumObj = env.FORUM.get(forumId);
        
        const requestURL = new URL(request.url);
        const validateURL = new URL(requestURL.origin);
        validateURL.pathname = "/validate";
        
        const validateHeaders = new Headers();
        validateHeaders.set('Authorization', authHeader);
        
        const validationResponse = await forumObj.fetch(validateURL.toString(), {
            method: 'GET',
            headers: validateHeaders
        });
        
        if (validationResponse.status !== 200) {
            console.log('❌ Invalid or expired token');
            return jsonResponse({ 
                success: false, 
                error: 'Invalid or expired authentication' 
            }, 401, request);
        }
        
        const validationData = await validationResponse.json();
        const username = validationData.user?.username;
        
        if (!username) {
            console.log('❌ No username found in validation');
            return jsonResponse({ 
                success: false, 
                error: 'Invalid user data' 
            }, 401, request);
        }

        // Parse the purchase data from frontend
        const purchaseData = await request.json();
        console.log('📦 Received purchase data:', purchaseData);

        // Create purchase record
        const purchaseRecord = {
            id: crypto.randomUUID(),
            username: username,
            orderId: purchaseData.orderId,
            productId: purchaseData.productId,
            size: purchaseData.size,
            amount: purchaseData.amount,
            status: purchaseData.status,
            environment: purchaseData.environment || 'sandbox',
            paypalData: purchaseData.paypalData || {},
            timestamp: new Date().toISOString(),
            userAgent: request.headers.get('User-Agent') || 'unknown'
        };

        // Store purchase using the user's durable object
        const userId = env.USERS.idFromName(`user-${username}`);
        const userObj = env.USERS.get(userId);
        
        // Store the purchase using the durable object's recordPurchase method
        try {
            await userObj.recordPurchase(purchaseRecord);
        } catch (error) {
            console.error('Error calling recordPurchase on user object:', error);
            // Fallback: store in a temporary way for now
            console.log('Storing purchase data in logs as fallback:', purchaseRecord);
            throw new Error('Failed to store purchase data');
        }

        console.log(`✅ Purchase successfully recorded for user: ${username}, Order ID: ${purchaseData.orderId}`);

        return jsonResponse({ 
            success: true, 
            purchaseId: purchaseRecord.id,
            message: 'Purchase recorded successfully',
            environment: purchaseRecord.environment
        }, 200, request);

    } catch (error) {
        console.error('❌ Error recording purchase:', error);
        return jsonResponse({ 
            success: false, 
            error: 'Failed to record purchase',
            details: error.message 
        }, 500, request);
    }
}

/**
 * Get user's purchase history
 * @param {Request} request 
 * @param {*} env 
 * @returns {Response}
 */
export async function handleGetPurchases(request, env) {
    try {
        // Verify authentication (same as above)
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return jsonResponse({ 
                success: false, 
                error: 'Authorization required' 
            }, 401, request);
        }

        const token = authHeader.split(' ')[1];
        
        // Validate token
        const forumId = env.FORUM.idFromName('forum-data');
        const forumObj = env.FORUM.get(forumId);
        
        const requestURL = new URL(request.url);
        const validateURL = new URL(requestURL.origin);
        validateURL.pathname = "/validate";
        
        const validateHeaders = new Headers();
        validateHeaders.set('Authorization', authHeader);
        
        const validationResponse = await forumObj.fetch(validateURL.toString(), {
            method: 'GET',
            headers: validateHeaders
        });
        
        if (validationResponse.status !== 200) {
            return jsonResponse({ 
                success: false, 
                error: 'Invalid or expired authentication' 
            }, 401, request);
        }
        
        const validationData = await validationResponse.json();
        const username = validationData.user?.username;

        // Get user's purchases
        const userId = env.USERS.idFromName(`user-${username}`);
        const userObj = env.USERS.get(userId);
        const purchases = await userObj.getUserPurchases(username);

        console.log(`📋 Retrieved ${purchases?.length || 0} purchases for user: ${username}`);

        return jsonResponse({ 
            success: true, 
            purchases: purchases || [] 
        }, 200, request);

    } catch (error) {
        console.error('❌ Error retrieving purchases:', error);
        return jsonResponse({ 
            success: false, 
            error: 'Failed to retrieve purchases' 
        }, 500, request);
    }
} 