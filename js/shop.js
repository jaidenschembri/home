// Shop functionality - no authentication required for viewing
// COMMENTED OUT - Shop authentication enforcement
// Uncomment the lines below and modify initShop() to re-enable authentication requirement:
// import { checkAuthentication } from './forum-auth.js';
// import { LOGIN_PROMPT_TEMPLATE } from './templates.js';

import { paypalConfig } from './paypal-config.js';
import { paypalLoader } from './paypal-loader.js';

// Product configuration
const PRODUCT = {
    id: 'say-yes-to-hvn-tshirt',
    name: 'Crucifix Hoodie',
    basePrice: 80.00,
    description: 'High-quality cotton hoodie with crucifix design'
};

// Initialize shop functionality when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    initShop();
});

// Main shop initialization function
function initShop() {
    const API_URL = 'https://still-wood-forum-v2.jaidenschembri1.workers.dev';
    console.log('Using API endpoint:', API_URL);
    
    // DOM elements
    const elements = {
        shopContainer: document.querySelector('.shop-container'),
        sizeSelector: document.getElementById('tshirt-size')
    };
    
    // Show shop content immediately (no authentication required for viewing)
    showShopContent();
    
    // COMMENTED OUT - Shop authentication enforcement
    // To re-enable authentication requirement for viewing shop, replace the above lines with:
    // checkAuthentication(
    //     API_URL,
    //     elements,
    //     'Shop',
    //     'You must be signed in to view and purchase items from the shop.'
    // );
    
    // Initialize PayPal button (no authentication required)
    initializePayPalButton();
    
    // COMMENTED OUT - PayPal button reinitialization on login
    // Since shop is now public, we don't need to reinitialize PayPal on login
    // Uncomment this if you want to re-enable purchase authentication:
    /*
    document.addEventListener('userLoggedIn', async () => {
        console.log('Login detected! Reinitializing PayPal button...');
        await initializePayPalButton();
    });
    */

    // Add size selector change handler
    if (elements.sizeSelector) {
        elements.sizeSelector.addEventListener('change', async () => {
            // Re-render PayPal button when size changes
            await initializePayPalButton();
        });
    }
}

// Show shop content (always visible)
function showShopContent() {
    const shopContainer = document.querySelector('.shop-container');
    if (shopContainer) {
        shopContainer.style.display = 'block';
    }
}

// Track PayPal initialization to prevent double rendering
let paypalInitialized = false;

// Initialize PayPal button
async function initializePayPalButton() {
    const container = document.getElementById('paypal-button-container');
    
    if (!container) {
        console.error('PayPal container not found');
        return;
    }
    
    // Prevent multiple initializations
    if (paypalInitialized) {
        console.log('PayPal already initialized, skipping...');
        return;
    }
    
    // Clear any existing content
    container.innerHTML = '';
    
    // COMMENTED OUT - Authentication requirement for purchases
    // Uncomment the code below to require login for purchases:
    /*
    // Check if user is authenticated
    const token = localStorage.getItem('authToken');
    const signedInText = document.querySelector('.signed-in-text');
    const isUserLoggedIn = signedInText && (window.getComputedStyle(signedInText).display !== 'none');
    
    console.log('PayPal init - Token exists:', !!token);
    console.log('PayPal init - User appears logged in:', isUserLoggedIn);
    
    if (!token || !isUserLoggedIn) {
        // Show login prompt for purchase
        container.innerHTML = `
            <div class="purchase-login-prompt">
                <p style="margin-bottom: 1rem; text-align: center; color: var(--text-color);">Sign in to purchase</p>
                <button class="purchase-login-btn" style="width: 100%; padding: 0.75rem; background: var(--primary-color); color: var(--bg-color); border: none; cursor: pointer; border-radius: 4px;">Sign In to Buy</button>
            </div>
        `;
        
        // Add click handler for login button
        const loginBtn = container.querySelector('.purchase-login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                const existingSignInBtn = document.querySelector('.signin-btn');
                if (existingSignInBtn) {
                    existingSignInBtn.click();
                }
            });
        }
        return;
    }
    */
    
    // Shop is now completely public - no authentication required for purchases
    
    try {
        // Check if PayPal is configured
        if (!paypalConfig.isConfigured()) {
            console.error('PayPal is not properly configured. Please set your client IDs.');
            container.innerHTML = '<p style="color: red; text-align: center;">Payment system is not configured</p>';
            return;
        }

        const sizeSelector = document.getElementById('tshirt-size');
        const selectedSize = sizeSelector ? sizeSelector.value : 'M';
        
        console.log(`Initializing PayPal in ${paypalConfig.getEnvironment()} mode`);

        // Show loading message
        container.innerHTML = '<p style="text-align: center;">Loading payment options...</p>';

        // Load PayPal SDK dynamically
        await paypalLoader.loadSDK();
        
        // Get PayPal instance
        const paypal = await paypalLoader.getPayPal();
        
        // Clear loading message
        container.innerHTML = '';

    paypal.Buttons({
        style: paypalConfig.getButtonStyle(),
        createOrder: (data, actions) => {
            console.log('Creating PayPal order...');
            return actions.order.create({
                purchase_units: [{
                    description: `${PRODUCT.name} (Size: ${selectedSize})`,
                    amount: {
                        currency_code: 'USD',
                        value: PRODUCT.basePrice.toString()
                    },
                    custom_id: `${PRODUCT.id}-${selectedSize}`,
                    reference_id: `${PRODUCT.id}-${selectedSize}-${Date.now()}`
                }],
                application_context: {
                    brand_name: 'NoJava Shop',
                    user_action: 'PAY_NOW'
                }
            });
        },
        onApprove: async (data, actions) => {
            console.log('PayPal payment approved, capturing order...');
            try {
                const order = await actions.order.capture();
                console.log('Order captured successfully:', order);
                await handleSuccessfulPayment(order, selectedSize);
            } catch (error) {
                console.error('Error capturing PayPal order:', error);
                alert('There was an error processing your payment. Please contact support.');
            }
        },
        onError: (err) => {
            console.error('PayPal Error:', err);
            alert('There was an error with the payment system. Please try again or contact support.');
        },
        onCancel: (data) => {
            console.log('PayPal payment cancelled by user:', data);
            alert('Payment was cancelled. You can try again anytime.');
        }
        }).render('#paypal-button-container').then(() => {
            console.log('PayPal button rendered successfully');
            paypalInitialized = true;
        }).catch(err => {
            console.error('Error rendering PayPal button:', err);
            if (container) {
                container.innerHTML = '<p style="color: red; text-align: center;">Unable to load payment options</p>';
            }
        });
        
    } catch (error) {
        console.error('Error initializing PayPal:', error);
        if (container) {
            container.innerHTML = '<p style="color: red; text-align: center;">Payment system unavailable</p>';
        }
    }
}

// Handle successful payment
async function handleSuccessfulPayment(order, size) {
    try {
        // COMMENTED OUT - Backend purchase recording (requires authentication)
        // Uncomment the code below to record purchases in backend with user authentication:
        /*
        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('No authentication token found');
        }

        console.log('Recording purchase in backend...', {
            orderId: order.id,
            productId: PRODUCT.id,
            size: size,
            amount: PRODUCT.basePrice,
            environment: paypalConfig.getEnvironment()
        });

        const API_URL = 'https://still-wood-forum-v2.jaidenschembri1.workers.dev';
        const response = await fetch(`${API_URL}/api/purchases`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                orderId: order.id,
                productId: PRODUCT.id,
                size: size,
                amount: PRODUCT.basePrice,
                status: order.status,
                environment: paypalConfig.getEnvironment(),
                paypalData: {
                    payerId: order.payer?.payer_id,
                    payerEmail: order.payer?.email_address,
                    captureId: order.purchase_units?.[0]?.payments?.captures?.[0]?.id,
                    createTime: order.create_time,
                    updateTime: order.update_time
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Backend response error:', errorData);
            throw new Error(`Failed to record purchase: ${response.status}`);
        }

        const result = await response.json();
        console.log('Purchase recorded successfully:', result);
        */
        
        // Show success message with order details
        const orderInfo = `
Order ID: ${order.id}
Product: ${PRODUCT.name} (Size: ${size})
Amount: $${PRODUCT.basePrice}
${paypalConfig.getEnvironment() === 'sandbox' ? '\n(This was a test transaction)' : ''}
        `.trim();
        
        alert(`Thank you for your purchase!\n\n${orderInfo}\n\nYou should receive a confirmation email shortly.`);
        
        // Refresh user data or update UI as needed
        document.dispatchEvent(new CustomEvent('userPurchaseComplete', {
            detail: { 
                product: PRODUCT.id,
                size: size,
                orderId: order.id,
                environment: paypalConfig.getEnvironment()
            }
        }));

    } catch (error) {
        console.error('Error processing purchase:', error);
        alert(`There was an error recording your purchase: ${error.message}\n\nPlease contact support with your PayPal transaction ID: ${order.id}`);
    }
}

// Shop is now public - authentication only required for purchases

// COMMENTED OUT - Shop login prompt function
// Uncomment the function below to re-enable full shop authentication:
/*
function showShopLoginPrompt(elements) {
    if (!elements.shopContainer) return;
    
    const contentContainer = elements.shopContainer.querySelector('.content');
    if (!contentContainer) return;
    
    // Apply the template with shop-specific title and message
    contentContainer.innerHTML = LOGIN_PROMPT_TEMPLATE(
        'Shop',
        'You must be signed in to view and purchase items from the shop.'
    );
    
    // Add event listener to the sign in button
    const signInPromptBtn = contentContainer.querySelector('.login-prompt-button');
    if (signInPromptBtn) {
        signInPromptBtn.addEventListener('click', () => {
            const existingSignInBtn = document.querySelector('.signin-btn');
            if (existingSignInBtn) {
                existingSignInBtn.click();
            } else {
                console.error('Signin button not found');
            }
        });
    }
}
*/ 