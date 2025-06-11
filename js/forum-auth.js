// Authentication-related functions for the forum

// Function to check if user is authenticated
export async function checkAuthentication(API_URL, elements, title = 'Forum', message) {
    console.log("Checking authentication status");
    const token = localStorage.getItem('authToken');
    const storedUsername = localStorage.getItem('username');
    
    console.log("Token exists:", !!token);
    console.log("Stored username:", storedUsername || "none");
    
    if (!token) {
        // User is not authenticated - hide forum content and show login prompt
        showLoginPrompt(elements, title, message);
        return false;
    }
    
    // Check if the user element exists in the header, which means user is logged in
    const signedInText = document.querySelector('.signed-in-text');
    const isDisplayed = signedInText && (window.getComputedStyle(signedInText).display !== 'none');
    console.log("Signed in text is displayed:", isDisplayed);
    
    // If username is stored and sign in text is displayed, user is authenticated
    if (isDisplayed && storedUsername) {
        console.log("User is already authenticated as:", storedUsername);
        // Trigger a background token refresh without waiting for it
        refreshTokenInBackground(API_URL, token);
        return true;
    }
    
    // If not immediately verified, check with the API
    console.log("Validating token with API");
    try {
        const response = await fetch(`${API_URL}/api/validate`, {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            mode: 'cors'
        });
        
        const data = await response.json();
        console.log("API validation response:", data);
        
        if (data.valid && data.user) {
            // Store username in localStorage for post ownership
            if (data.user.username) {
                localStorage.setItem('username', data.user.username);
                console.log("Username stored:", data.user.username);
            }
            return true;
        } else {
            // Token is invalid - hide forum content and show login prompt
            localStorage.removeItem('authToken');
            localStorage.removeItem('username');
            showLoginPrompt(elements, title, message);
            return false;
        }
    } catch (error) {
        console.error('Error validating token:', error);
        // On network errors, don't automatically log the user out
        if (storedUsername) {
            console.log("Network error but keeping user session active");
            return true;
        }
        
        // If we have no username stored, show error message
        if (elements.forumContainer) {
            elements.forumContainer.querySelector('.content').innerHTML = `
                <div class="error-message">
                    <p>Error connecting to server. Please try again later.</p>
                </div>
            `;
        }
        return false;
    }
}

// Function to refresh token in the background without affecting user experience
function refreshTokenInBackground(API_URL, token) {
    fetch(`${API_URL}/api/validate`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        mode: 'cors'
    })
    .then(response => response.json())
    .then(data => {
        console.log("Background token refresh result:", data.valid ? "success" : "failed");
    })
    .catch(error => {
        console.error("Background token refresh error:", error);
    });
}

// Login prompt template
const LOGIN_PROMPT_TEMPLATE = (title, message = 'You must be signed in to view and participate in the forum.') => `
    <div class="login-prompt-container">
        <div class="login-prompt-content">
            <div class="login-prompt-title-bar">
                <span class="login-prompt-title">${title}</span>
            </div>
            <p class="login-prompt-message">${message}</p>
            <button class="login-prompt-button">Sign In</button>
        </div>
    </div>
`;

// Function to show login prompt instead of forum content
export function showLoginPrompt(elements, title = 'Forum', message = 'You must be signed in to view and participate in the forum.') {
    const loginPromptContainer = document.getElementById('login-prompt');
    const forumContainer = document.querySelector('.forum-container');
    
    if (!loginPromptContainer) return;
    
    // Show login prompt and hide forum content only (shop remains public)
    loginPromptContainer.style.display = 'block';
    if (forumContainer) forumContainer.style.display = 'none';
    
    // Apply the template with the provided title and message
    loginPromptContainer.innerHTML = LOGIN_PROMPT_TEMPLATE(title, message);
    
    // Add event listener to the sign in button
    const signInPromptBtn = loginPromptContainer.querySelector('.login-prompt-button');
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
        console.log('Login detected! Loading forum content...');
        // Hide login prompt and show forum content
        loginPromptContainer.style.display = 'none';
        if (forumContainer) forumContainer.style.display = 'block';
        document.dispatchEvent(new CustomEvent('forumLoginSuccess'));
        // Remove the event listener after successful login
        document.removeEventListener('userLoggedIn', loginHandler);
    };
    
    document.addEventListener('userLoggedIn', loginHandler);
}

// Function to check API connection
export async function checkApiConnection(API_URL, elements) {
    if (elements.apiStatus) {
        elements.apiStatus.textContent = 'Checking...';
        elements.apiStatus.style.color = '#666';
    }
    
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            if (elements.apiStatus) {
                elements.apiStatus.textContent = 'Not authenticated';
                elements.apiStatus.style.color = '#fa5252';
            }
            return;
        }
        
        const response = await fetch(`${API_URL}/api/validate`, {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            mode: 'cors'
        });
        
        const data = await response.json();
        
        if (data.valid) {
            if (elements.apiStatus) {
                elements.apiStatus.textContent = 'Connected (API working)';
                elements.apiStatus.style.color = '#51cf66';
            }
            console.log('API connection successful');
        } else {
            if (elements.apiStatus) {
                elements.apiStatus.textContent = 'Error: Authentication invalid';
                elements.apiStatus.style.color = '#fa5252';
            }
            console.log('API connection failed: Auth invalid');
        }
    } catch (error) {
        console.error('API connection check failed:', error);
        if (elements.apiStatus) {
            elements.apiStatus.textContent = `Error: ${error.message}`;
            elements.apiStatus.style.color = '#fa5252';
        }
    }
} 