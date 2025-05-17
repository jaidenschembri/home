// Main document ready handler
window.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initStarfield();
    initAuthModal();
});

// Theme toggle functionality
function initThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle');
    const toggleIcon = document.getElementById('toggleIcon');
    
    if (!toggleBtn || !toggleIcon) {
        console.error("Theme toggle elements not found");
        return;
    }
    
    let isDark = true; // Default to dark mode

    toggleBtn.addEventListener('click', () => {
        // Toggle the body class for theme switching
        document.body.classList.toggle('light-theme');
        
        // Update the icon animation
        if (isDark) {
            toggleIcon.classList.remove('dark');
            toggleIcon.classList.add('to-light', 'light');
        } else {
            toggleIcon.classList.remove('light');
            toggleIcon.classList.add('to-dark', 'dark');
        }
        
        // Reset animation classes after animation completes
        setTimeout(() => {
            toggleIcon.classList.remove('to-light', 'to-dark');
        }, 500);
        
        isDark = !isDark;
    });
}

// Starfield background animation
function initStarfield() {
    const canvas = document.getElementById('space-bg');
    if (!canvas) {
        console.error("Starfield canvas not found");
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("Could not get canvas context");
        return;
    }

    // === Adjustable Settings ===
    const STAR_COUNT = 100;
    const STAR_MIN_RADIUS = 0.5;
    const STAR_MAX_RADIUS = 1.5;
    const STAR_SPEED = 0.2;

    let stars = [];

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function initStars() {
        stars = [];
        for (let i = 0; i < STAR_COUNT; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * canvas.width / 2;
            stars.push({
                x: canvas.width / 2 + Math.cos(angle) * distance,
                y: canvas.height / 2 + Math.sin(angle) * distance,
                radius: Math.random() * (STAR_MAX_RADIUS - STAR_MIN_RADIUS) + STAR_MIN_RADIUS,
                angle,
                speed: Math.random() * STAR_SPEED + 0.1,
            });
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const isLight = document.body.classList.contains('light-theme');
        ctx.fillStyle = isLight ? '#000000' : '#ffffff';

        stars.forEach(star => {
            star.x += Math.cos(star.angle) * star.speed;
            star.y += Math.sin(star.angle) * star.speed;

            // Reset if off screen
            if (
                star.x < 0 || star.x > canvas.width ||
                star.y < 0 || star.y > canvas.height
            ) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * canvas.width / 10;
                star.x = canvas.width / 2 + Math.cos(angle) * distance;
                star.y = canvas.height / 2 + Math.sin(angle) * distance;
                star.angle = angle;
            }

            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', () => {
        resizeCanvas();
        initStars();
    });

    resizeCanvas();
    initStars();
    animate();
}

// === AUTH MODAL LOGIC ===
function initAuthModal() {
    // Configure API URL based on environment
    // Use the same URL in both local development and production since our changes are deployed
    const API_URL = 'https://still-wood-e0a1.jaidenschembri1.workers.dev';
    console.log('Using API URL:', API_URL);
    
    const modal = document.getElementById('auth-modal');
    const overlay = document.getElementById('auth-modal-overlay');
    const openBtn = document.querySelector('.signin-btn');
    const closeBtn = document.getElementById('auth-modal-close');
    const showLoginBtn = document.getElementById('show-login');
    const showRegisterLink = document.getElementById('show-register-link');
    const showRegisterAnchor = document.getElementById('show-register');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const responseDiv = document.getElementById('auth-response');
    const showLoginLink = document.getElementById('show-login-link');
    const showLoginAnchor = document.getElementById('show-login');
    const signedInText = document.querySelector('.signed-in-text');
    const usernameSpan = document.querySelector('.signed-in-text .username');

    // Check if the user is already logged in
    function checkAuthStatus() {
        const token = localStorage.getItem('authToken');
        if (token) {
            // Validate token and get user info
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
                if (data.valid && data.user) {
                    // Show signed in text with username
                    showSignedInState(data.user.username);
                } else {
                    // Token is invalid, remove it
                    localStorage.removeItem('authToken');
                    showSignedOutState();
                }
            })
            .catch(error => {
                console.error('Error validating token:', error);
                localStorage.removeItem('authToken');
                showSignedOutState();
            });
        } else {
            showSignedOutState();
        }
    }

    // Show signed in state
    function showSignedInState(username) {
        if (openBtn) openBtn.style.display = 'none';
        if (signedInText) {
            signedInText.style.display = 'block';
            if (usernameSpan) usernameSpan.textContent = username;
        }
    }

    // Show signed out state
    function showSignedOutState() {
        if (openBtn) openBtn.style.display = 'block';
        if (signedInText) signedInText.style.display = 'none';
    }
    
    // Logout function
    function logout() {
        localStorage.removeItem('authToken');
        showSignedOutState();
    }
    
    // Add logout event listener to signed-in text
    if (signedInText) {
        signedInText.addEventListener('click', () => {
            if (confirm('Are you sure you want to log out?')) {
                logout();
            }
        });
    }

    function showModal() {
        modal.style.display = 'block';
        overlay.style.display = 'block';
        modal.style.opacity = 1;
        overlay.style.opacity = 1;
        showLogin();
    }
    function hideModal() {
        modal.style.display = 'none';
        overlay.style.display = 'none';
        modal.style.opacity = 1;
        overlay.style.opacity = 1;
        responseDiv.textContent = '';
        responseDiv.className = '';
        loginForm.reset();
        registerForm.reset();
    }
    function showLogin() {
        loginForm.style.display = 'flex';
        registerForm.style.display = 'none';
        document.getElementById('auth-modal-title').textContent = 'Sign In';
        if (showRegisterLink) showRegisterLink.style.display = 'block';
        if (showLoginLink) showLoginLink.style.display = 'none';
        responseDiv.textContent = '';
    }
    function showRegister() {
        loginForm.style.display = 'none';
        registerForm.style.display = 'flex';
        document.getElementById('auth-modal-title').textContent = 'Sign Up';
        if (showRegisterLink) showRegisterLink.style.display = 'none';
        if (showLoginLink) showLoginLink.style.display = 'block';
        responseDiv.textContent = '';
    }

    openBtn.addEventListener('click', showModal);
    closeBtn.addEventListener('click', hideModal);
    overlay.addEventListener('click', hideModal);
    showLoginBtn.addEventListener('click', showLogin);
    if (showRegisterAnchor) {
        showRegisterAnchor.addEventListener('click', function(e) {
            e.preventDefault();
            showRegister();
        });
    }
    if (showLoginAnchor) {
        showLoginAnchor.addEventListener('click', function(e) {
            e.preventDefault();
            showLogin();
        });
    }

    // Register form logic
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('regEmail').value;
        const username = document.getElementById('regUsername').value;
        const password = document.getElementById('regPassword').value;
        const inviteCode = document.getElementById('regInvite').value;
        
        console.log('Attempting registration with API URL:', API_URL);
        
        try {
            const response = await fetch(`${API_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, username, password, inviteCode }),
                mode: 'cors'
            });
            
            console.log('Registration response status:', response.status);
            const data = await response.json();
            console.log('Registration response data:', data);
            
            responseDiv.textContent = JSON.stringify(data, null, 2);
            if (response.ok) {
                // Auto-fill login form if registration was successful
                document.getElementById('loginUsername').value = username;
                document.getElementById('loginPassword').value = password;
                showLogin();
            }
        } catch (error) {
            console.error('Registration error:', error);
            responseDiv.textContent = `Error: ${error.message}`;
        }
    });

    // Login form logic
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        responseDiv.textContent = "Logging in...";
        
        try {
            const response = await fetch(`${API_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                mode: 'cors'
            });
            const data = await response.json();
            
            if (response.ok && data.token) {
                localStorage.setItem('authToken', data.token);
                responseDiv.className = 'auth-success';
                responseDiv.textContent = `Welcome, ${data.user.username}!`;
                
                // Update UI to show signed in state
                showSignedInState(data.user.username);
                
                // Fade out and hide modal
                setTimeout(() => {
                    const fadeEffect = setInterval(() => {
                        if (!modal.style.opacity) {
                            modal.style.opacity = 1;
                            overlay.style.opacity = 1;
                        }
                        if (modal.style.opacity > 0) {
                            modal.style.opacity -= 0.1;
                            overlay.style.opacity -= 0.1;
                        } else {
                            clearInterval(fadeEffect);
                            hideModal();
                        }
                    }, 50);
                }, 1000);
            } else {
                responseDiv.className = 'auth-error';
                responseDiv.textContent = data.error || 'Login failed. Please check your credentials.';
            }
        } catch (error) {
            responseDiv.className = 'auth-error';
            responseDiv.textContent = `Error: ${error.message}`;
        }
    });
    
    // Check authentication status on init
    checkAuthStatus();
}