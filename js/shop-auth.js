// COMMENTED OUT - Shop authentication enforcement
// Uncomment the code below to re-enable authentication requirement for shop viewing

/*
import { checkAuthentication } from './forum-auth.js';
import { LOGIN_PROMPT_TEMPLATE } from './templates.js';

// Function to show login prompt for shop
export function showShopLoginPrompt(elements) {
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
    
    // Listen for successful login event
    const loginHandler = () => {
        console.log('Login detected! Loading shop content...');
        document.dispatchEvent(new CustomEvent('shopLoginSuccess'));
        // Remove the event listener after successful login
        document.removeEventListener('userLoggedIn', loginHandler);
    };
    
    document.addEventListener('userLoggedIn', loginHandler);
}

// Initialize shop authentication
export async function initShopAuth(API_URL) {
    const elements = {
        shopContainer: document.querySelector('.shop-container')
    };
    
    const isAuthenticated = await checkAuthentication(API_URL, elements);
    if (!isAuthenticated) {
        showShopLoginPrompt(elements);
    }
}
*/ 