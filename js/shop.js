import { checkAuthentication } from './forum-auth.js';
import { LOGIN_PROMPT_TEMPLATE } from './templates.js';

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
        shopContainer: document.querySelector('.shop-container')
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
        // Here you would typically load the shop content
        // For now, we'll just show the coming soon message
        if (elements.shopContainer) {
            const content = elements.shopContainer.querySelector('.content');
            if (content) {
                content.innerHTML = `
                    <p>Coming Soon</p>
                `;
            }
        }
    });
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