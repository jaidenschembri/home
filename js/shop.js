import { checkAuthentication } from './forum-auth.js';
import { LOGIN_PROMPT_TEMPLATE } from './templates.js';

// Product configuration
const PRODUCT = {
    id: 'say-yes-to-hvn-tshirt',
    name: 'Say Yes to HVN T-Shirt',
    basePrice: 24.99,
    description: 'High-quality cotton t-shirt with the iconic "Say Yes to HVN" design'
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
    
    // Check authentication on page load
    checkAuthentication(
        API_URL,
        elements,
        'Shop',
        'You must be signed in to view and purchase items from the shop.'
    );
    
    // Listen for successful login
    document.addEventListener('userLoggedIn', () => {
        console.log('Login detected! Loading shop content...');
        initializePayPalButton();
    });

    // Add size selector change handler
    if (elements.sizeSelector) {
        elements.sizeSelector.addEventListener('change', () => {
            // Re-render PayPal button when size changes
            initializePayPalButton();
        });
    }
}

// Initialize PayPal button
function initializePayPalButton() {
    const sizeSelector = document.getElementById('tshirt-size');
    const selectedSize = sizeSelector ? sizeSelector.value : 'M';

    paypal.Buttons({
        style: {
            layout: 'vertical',
            color: 'blue',
            shape: 'rect',
            label: 'pay'
        },
        createOrder: (data, actions) => {
            return actions.order.create({
                purchase_units: [{
                    description: `${PRODUCT.name} (Size: ${selectedSize})`,
                    amount: {
                        value: PRODUCT.basePrice.toString()
                    },
                    custom_id: `${PRODUCT.id}-${selectedSize}`
                }]
            });
        },
        onApprove: async (data, actions) => {
            const order = await actions.order.capture();
            handleSuccessfulPayment(order, selectedSize);
        },
        onError: (err) => {
            console.error('PayPal Error:', err);
            alert('There was an error processing your payment. Please try again.');
        }
    }).render('#paypal-button-container');
}

// Handle successful payment
async function handleSuccessfulPayment(order, size) {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('No authentication token found');
        }

        const response = await fetch(`${CONFIG.API_URL}/api/purchases`, {
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
                status: order.status
            })
        });

        if (!response.ok) {
            throw new Error('Failed to record purchase');
        }

        const result = await response.json();
        
        // Show success message
        alert(`Thank you for your purchase! Your ${PRODUCT.name} (Size: ${size}) will be shipped soon.`);
        
        // Refresh user data or update UI as needed
        document.dispatchEvent(new CustomEvent('userPurchaseComplete', {
            detail: { 
                product: PRODUCT.id,
                size: size
            }
        }));

    } catch (error) {
        console.error('Error processing purchase:', error);
        alert('There was an error processing your purchase. Please contact support.');
    }
}

// Function to show login prompt for shop
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