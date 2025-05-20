// UI Templates
export const LOGIN_PROMPT_TEMPLATE = (title, message = 'You must be signed in to view and participate in the forum.') => `
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