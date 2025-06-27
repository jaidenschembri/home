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
    
    // Reset initialization flag to allow re-rendering when size changes
    paypalInitialized = false;
    
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
        
        // Validate size selection
        if (!selectedSize || selectedSize.trim() === '') {
            container.innerHTML = '<p style="color: red; text-align: center;">Please select a size first</p>';
            return;
        }
        
        console.log(`Initializing PayPal in ${paypalConfig.getEnvironment()} mode`);

        // Load PayPal SDK
        await paypalLoader.loadSDK();
        const paypal = await paypalLoader.getPayPal();

    paypal.Buttons({
        style: paypalConfig.getButtonStyle(),
        createOrder: function(data, actions) {
            console.log('Creating PayPal order...');
            
            // Simple validation
            if (!selectedSize) {
                alert('Please select a size first');
                return Promise.reject(new Error('No size selected'));
            }
            
            return actions.order.create({
                purchase_units: [{
                    description: `${PRODUCT.name} (Size: ${selectedSize})`,
                    amount: {
                        currency_code: 'USD',
                        value: PRODUCT.basePrice.toFixed(2)
                    }
                }]
            });
        },
        onApprove: function(data, actions) {
            console.log('Payment approved, capturing...');
            
            return actions.order.capture().then(function(details) {
                console.log('Payment completed:', details);
                
                // Simple success handling
                alert(`✅ Payment successful!\n\nOrder ID: ${details.id}\nAmount: $${PRODUCT.basePrice}\nSize: ${selectedSize}\n\n⚠️ This was a sandbox test transaction`);
                
                // Update UI
                const container = document.getElementById('paypal-button-container');
                if (container) {
                    container.innerHTML = '<p style="color: green; text-align: center;">✅ Payment completed!</p>';
                }
                
                return details;
            });
        },
        onError: function(err) {
            console.error('PayPal error:', err);
            alert('Payment failed. Please try again.');
        },
        onCancel: function(data) {
            console.log('Payment cancelled');
            // No alert needed for user cancellation
        }
    }).render('#paypal-button-container');
        
    } catch (error) {
        console.error('Error initializing PayPal:', error);
        if (container) {
            container.innerHTML = '<p style="color: red; text-align: center;">Payment system unavailable</p>';
        }
    }
}

// Simple success message function
function showPurchaseSuccess(orderId, amount, size) {
    console.log('Purchase completed successfully');
    
    // Dispatch event for any listeners
    document.dispatchEvent(new CustomEvent('userPurchaseComplete', {
        detail: { 
            product: PRODUCT.id,
            size: size,
            orderId: orderId,
            environment: paypalConfig.getEnvironment()
        }
    }));
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