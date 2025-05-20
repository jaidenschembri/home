// Constants
const CONFIG = {
    API_URL: 'https://still-wood-forum-v2.jaidenschembri1.workers.dev',
    AUTH_TOKEN_KEY: 'authToken',
    ANIMATION_TIMEOUT: 500,
    MODAL_FADE_TIMEOUT: 1000,
    MODAL_FADE_INTERVAL: 50,
    STAR_COUNT: 100,
    STAR_MIN_RADIUS: 0.5,
    STAR_MAX_RADIUS: 1.5,
    STAR_SPEED: 0.2
};

// Utility functions
const Utils = {
    async fetchWithErrorHandling(url, options) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`Network response error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Fetch error for ${url}:`, error);
            throw error;
        }
    }
};

// Theme module
const ThemeManager = {
    init() {
        const toggleBtn = document.getElementById('theme-toggle');
        const toggleIcon = document.getElementById('toggleIcon');
        
        if (!toggleBtn || !toggleIcon) {
            console.error("Theme toggle elements not found");
            return;
        }
        
        // Get saved theme preference or default to dark
        const savedTheme = localStorage.getItem('theme');
        let isDark = savedTheme === null ? true : savedTheme === 'dark';
        
        // Set initial theme state
        if (!isDark) {
            document.body.classList.add('light-theme');
            toggleIcon.classList.remove('dark');
            toggleIcon.classList.add('light');
        }

        toggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            
            if (isDark) {
                toggleIcon.classList.remove('dark');
                toggleIcon.classList.add('to-light', 'light');
                localStorage.setItem('theme', 'light');
            } else {
                toggleIcon.classList.remove('light');
                toggleIcon.classList.add('to-dark', 'dark');
                localStorage.setItem('theme', 'dark');
            }
            
            setTimeout(() => {
                toggleIcon.classList.remove('to-light', 'to-dark');
            }, CONFIG.ANIMATION_TIMEOUT);
            
            isDark = !isDark;
        });
    }
};

// Starfield module
const StarfieldManager = {
    canvas: null,
    ctx: null,
    stars: [],

    init() {
        this.canvas = document.getElementById('space-bg');
        if (!this.canvas) {
            console.error("Starfield canvas not found");
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            console.error("Could not get canvas context");
            return;
        }

        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.initStars();
        });

        this.resizeCanvas();
        this.initStars();
        this.animate();
    },

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },

    initStars() {
        this.stars = [];
        for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.canvas.width / 2;
            this.stars.push({
                x: this.canvas.width / 2 + Math.cos(angle) * distance,
                y: this.canvas.height / 2 + Math.sin(angle) * distance,
                radius: Math.random() * (CONFIG.STAR_MAX_RADIUS - CONFIG.STAR_MIN_RADIUS) + CONFIG.STAR_MIN_RADIUS,
                angle,
                speed: Math.random() * CONFIG.STAR_SPEED + 0.1,
            });
        }
    },

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const isLight = document.body.classList.contains('light-theme');
        this.ctx.fillStyle = isLight ? '#000000' : '#ffffff';

        this.stars.forEach(star => {
            star.x += Math.cos(star.angle) * star.speed;
            star.y += Math.sin(star.angle) * star.speed;

            if (
                star.x < 0 || star.x > this.canvas.width ||
                star.y < 0 || star.y > this.canvas.height
            ) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * this.canvas.width / 10;
                star.x = this.canvas.width / 2 + Math.cos(angle) * distance;
                star.y = this.canvas.height / 2 + Math.sin(angle) * distance;
                star.angle = angle;
            }

            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });

        requestAnimationFrame(() => this.animate());
    }
};

// Auth module
const AuthManager = {
    modal: null,
    overlay: null,
    openBtn: null,
    closeBtn: null,
    showLoginBtn: null,
    showRegisterLink: null,
    showRegisterAnchor: null,
    loginForm: null,
    registerForm: null,
    responseDiv: null,
    showLoginLink: null,
    showLoginAnchor: null,
    signedInText: null,
    usernameSpan: null,
    tokenRefreshInterval: null,

    init() {
        console.log('Using API URL:', CONFIG.API_URL);
        
        this.initializeElements();
        this.setupEventListeners();
        this.checkAuthStatus();
    },

    initializeElements() {
        this.modal = document.getElementById('auth-modal');
        this.overlay = document.getElementById('auth-modal-overlay');
        this.openBtn = document.querySelector('.signin-btn');
        this.closeBtn = document.getElementById('auth-modal-close');
        this.showLoginBtn = document.getElementById('show-login');
        this.showRegisterLink = document.getElementById('show-register-link');
        this.showRegisterAnchor = document.getElementById('show-register');
        this.loginForm = document.getElementById('loginForm');
        this.registerForm = document.getElementById('registerForm');
        this.responseDiv = document.getElementById('auth-response');
        this.showLoginLink = document.getElementById('show-login-link');
        this.showLoginAnchor = document.getElementById('show-login');
        this.signedInText = document.querySelector('.signed-in-text');
        this.usernameSpan = document.querySelector('.signed-in-text .username');
    },

    setupEventListeners() {
        this.openBtn.addEventListener('click', () => this.showModal());
        this.closeBtn.addEventListener('click', () => this.hideModal());
        this.overlay.addEventListener('click', () => this.hideModal());
        this.showLoginBtn.addEventListener('click', () => this.showLogin());
        
        if (this.showRegisterAnchor) {
            this.showRegisterAnchor.addEventListener('click', (e) => {
                e.preventDefault();
                this.showRegister();
            });
        }
        
        if (this.showLoginAnchor) {
            this.showLoginAnchor.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLogin();
            });
        }

        this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));

        if (this.signedInText) {
            this.signedInText.addEventListener('click', () => {
                if (confirm('Are you sure you want to log out?')) {
                    this.logout();
                }
            });
        }
    },

    async checkAuthStatus() {
        const token = localStorage.getItem(CONFIG.AUTH_TOKEN_KEY);
        if (token) {
            try {
                const data = await Utils.fetchWithErrorHandling(`${CONFIG.API_URL}/api/validate`, {
                    method: 'GET',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    mode: 'cors'
                });
                
                if (data.valid && data.user) {
                    // Store username for easy access
                    localStorage.setItem('username', data.user.username);
                    this.showSignedInState(data.user.username);
                    
                    // Set token refresh schedule - check every 12 hours
                    if (!this.tokenRefreshInterval) {
                        this.tokenRefreshInterval = setInterval(() => {
                            this.refreshAuthToken();
                        }, 12 * 60 * 60 * 1000); // 12 hours
                    }
                } else {
                    localStorage.removeItem(CONFIG.AUTH_TOKEN_KEY);
                    localStorage.removeItem('username');
                    this.showSignedOutState();
                    this.clearTokenRefresh();
                }
            } catch (error) {
                console.error('Error validating token:', error);
                localStorage.removeItem(CONFIG.AUTH_TOKEN_KEY);
                localStorage.removeItem('username');
                this.showSignedOutState();
                this.clearTokenRefresh();
            }
        } else {
            this.showSignedOutState();
            this.clearTokenRefresh();
        }
    },

    showSignedInState(username) {
        if (this.openBtn) this.openBtn.style.display = 'none';
        if (this.signedInText) {
            this.signedInText.style.display = 'block';
            if (this.usernameSpan) this.usernameSpan.textContent = username;
        }
    },

    showSignedOutState() {
        if (this.openBtn) this.openBtn.style.display = 'block';
        if (this.signedInText) this.signedInText.style.display = 'none';
    },

    async logout() {
        const token = localStorage.getItem(CONFIG.AUTH_TOKEN_KEY);
        
        // Clear local storage first for immediate UI feedback
        localStorage.removeItem(CONFIG.AUTH_TOKEN_KEY);
        localStorage.removeItem('username');
        this.showSignedOutState();
        this.clearTokenRefresh();
        
        // Attempt to invalidate token on server (not critical if it fails)
        if (token) {
            try {
                // This is a best-effort invalidation - we don't need to wait for it
                fetch(`${CONFIG.API_URL}/api/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    mode: 'cors'
                }).catch(err => {
                    console.log('Token invalidation failed, but user is still logged out locally');
                });
            } catch (error) {
                console.log('Error during logout attempt, but user is still logged out locally');
            }
        }
    },

    showModal() {
        this.modal.style.display = 'block';
        this.overlay.style.display = 'block';
        this.modal.style.opacity = 1;
        this.overlay.style.opacity = 1;
        this.showLogin();
    },

    hideModal() {
        this.modal.style.display = 'none';
        this.overlay.style.display = 'none';
        this.modal.style.opacity = 1;
        this.overlay.style.opacity = 1;
        this.responseDiv.textContent = '';
        this.responseDiv.className = '';
        this.loginForm.reset();
        this.registerForm.reset();
    },

    showLogin() {
        this.loginForm.style.display = 'flex';
        this.registerForm.style.display = 'none';
        document.getElementById('auth-modal-title').textContent = 'Sign In';
        if (this.showRegisterLink) this.showRegisterLink.style.display = 'block';
        if (this.showLoginLink) this.showLoginLink.style.display = 'none';
        this.responseDiv.textContent = '';
    },

    showRegister() {
        this.loginForm.style.display = 'none';
        this.registerForm.style.display = 'flex';
        document.getElementById('auth-modal-title').textContent = 'Sign Up';
        if (this.showRegisterLink) this.showRegisterLink.style.display = 'none';
        if (this.showLoginLink) this.showLoginLink.style.display = 'block';
        this.responseDiv.textContent = '';
    },

    async handleRegister(e) {
        e.preventDefault();
        const email = document.getElementById('regEmail').value;
        const username = document.getElementById('regUsername').value;
        const password = document.getElementById('regPassword').value;
        const inviteCode = document.getElementById('regInvite').value;
        
        if (!this.validateForm(email, username, password)) return;
        
        console.log('Attempting registration with API URL:', CONFIG.API_URL);
        
        try {
            const data = await Utils.fetchWithErrorHandling(`${CONFIG.API_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, username, password, inviteCode }),
                mode: 'cors'
            });
            
            console.log('Registration response data:', data);
            
            this.responseDiv.textContent = JSON.stringify(data, null, 2);
            if (data.success) {
                document.getElementById('loginUsername').value = username;
                document.getElementById('loginPassword').value = password;
                this.showLogin();
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.responseDiv.textContent = `Error: ${error.message}`;
        }
    },

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!this.validateForm(username, password)) return;
        
        this.responseDiv.textContent = "Logging in...";
        
        try {
            const data = await Utils.fetchWithErrorHandling(`${CONFIG.API_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                mode: 'cors'
            });
            
            if (data.token) {
                localStorage.setItem(CONFIG.AUTH_TOKEN_KEY, data.token);
                // Store username for easy access
                localStorage.setItem('username', data.user.username);
                this.responseDiv.className = 'auth-success';
                this.responseDiv.textContent = `Welcome, ${data.user.username}!`;
                
                this.showSignedInState(data.user.username);
                
                // Start token refresh interval
                this.clearTokenRefresh(); // Clear any existing interval
                this.tokenRefreshInterval = setInterval(() => {
                    this.refreshAuthToken();
                }, 12 * 60 * 60 * 1000); // 12 hours
                
                document.dispatchEvent(new CustomEvent('userLoggedIn', {
                    detail: { username: data.user.username }
                }));
                
                setTimeout(() => {
                    const fadeEffect = setInterval(() => {
                        if (!this.modal.style.opacity) {
                            this.modal.style.opacity = 1;
                            this.overlay.style.opacity = 1;
                        }
                        if (this.modal.style.opacity > 0) {
                            this.modal.style.opacity -= 0.1;
                            this.overlay.style.opacity -= 0.1;
                        } else {
                            clearInterval(fadeEffect);
                            this.hideModal();
                        }
                    }, CONFIG.MODAL_FADE_INTERVAL);
                }, CONFIG.MODAL_FADE_TIMEOUT);
            } else {
                this.responseDiv.className = 'auth-error';
                this.responseDiv.textContent = data.error || 'Login failed. Please check your credentials.';
            }
        } catch (error) {
            this.responseDiv.className = 'auth-error';
            this.responseDiv.textContent = `Error: ${error.message}`;
        }
    },

    validateForm(...fields) {
        if (fields.some(field => !field)) {
            this.responseDiv.className = 'auth-error';
            this.responseDiv.textContent = 'All fields are required';
            return false;
        }
        return true;
    },

    // Refresh auth token to extend session
    async refreshAuthToken() {
        const token = localStorage.getItem(CONFIG.AUTH_TOKEN_KEY);
        if (!token) {
            this.clearTokenRefresh();
            return;
        }
        
        try {
            // This endpoint validates the token which effectively refreshes the session
            const data = await Utils.fetchWithErrorHandling(`${CONFIG.API_URL}/api/validate`, {
                method: 'GET',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                mode: 'cors'
            });
            
            if (!data.valid) {
                // If token becomes invalid, remove it and clear interval
                localStorage.removeItem(CONFIG.AUTH_TOKEN_KEY);
                localStorage.removeItem('username');
                this.showSignedOutState();
                this.clearTokenRefresh();
            }
        } catch (error) {
            console.error('Error refreshing token:', error);
            // Don't immediately log out on network errors
        }
    },
    
    clearTokenRefresh() {
        if (this.tokenRefreshInterval) {
            clearInterval(this.tokenRefreshInterval);
            this.tokenRefreshInterval = null;
        }
    }
};

// Main initialization
window.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
    StarfieldManager.init();
    AuthManager.init();
});