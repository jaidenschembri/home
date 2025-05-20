// Import admin functions from forum-admin.js
import { deleteReply, deleteThread, confirmPurgeAllPosts, purgeAllPosts } from './forum-admin.js';
// Import utility functions from forum-utils.js
import { escapeHTML, processGreentextAndLinks, extractImageHtml, formatTimestamp } from './forum-utils.js';
// Import thread and reply functions
import { addThreadToList, addReplyToThread, setupReplyToggleAndForm, handleReplySubmission } from './forum-threads.js';
// Import authentication functions
import { checkAuthentication, showLoginPrompt, checkApiConnection } from './forum-auth.js';
// Import submission functions
import { handleThreadSubmission, setupImageUploadHandlers } from './forum-submission.js';

// Initialize forum functionality when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    initForum();
});

// Main forum initialization function
function initForum() {
    const API_URL = 'https://still-wood-forum-v2.jaidenschembri1.workers.dev';
    console.log('Using API endpoint:', API_URL);
    
    // DOM elements
    const elements = {
        postForm: document.getElementById('postForm'),
        postContent: document.getElementById('postContent'),
        postResponse: document.getElementById('post-response'),
        postsList: document.getElementById('postsList'),
        forumContainer: document.querySelector('.forum-container'),
        authModal: document.getElementById('auth-modal'),
        authOverlay: document.getElementById('auth-modal-overlay'),
        togglePostFormBtn: document.getElementById('toggle-post-form'),
        postFormWindow: document.querySelector('.post-form-window'),
        apiStatus: document.getElementById('api-status'),
        checkApiBtn: document.getElementById('check-api'),
        adminModeBtn: document.getElementById('admin-mode'),
        adminControls: document.getElementById('admin-controls')
    };
    
    // Local cache for posts - will be synced with API
    let postsCache = [];
    // Admin mode flag
    let adminMode = false;
    
    // Initialize UI components
    initializeUIComponents();
    
    // Check API connection on load
    checkApiConnection(API_URL, elements);

    // Check authentication on page load
    checkAuthentication(API_URL, elements).then(isAuthenticated => {
        if (isAuthenticated) {
            showForumContent();
            loadPosts();
        }
    });
    
    // Listen for successful login
    document.addEventListener('forumLoginSuccess', () => {
        showForumContent();
        loadPosts();
        // Check admin status after login
        setTimeout(checkAdminStatus, 500);
    });
    
    // Periodically refresh posts to keep them current
    setupPostRefresh();
    
    // UI Initialization
    function initializeUIComponents() {
        // Toggle post form visibility
        if (elements.togglePostFormBtn && elements.postFormWindow) {
            elements.togglePostFormBtn.addEventListener('click', (e) => {
                e.preventDefault();
                elements.postFormWindow.style.display = elements.postFormWindow.style.display === 'none' ? 'block' : 'none';
            });
        }
        
        // Initialize image upload functionality
        setupImageUploadHandlers();
        
        // Debug tool initialization
        if (elements.checkApiBtn) {
            elements.checkApiBtn.addEventListener('click', () => checkApiConnection(API_URL, elements));
        }
        
        // Initialize admin mode button if it exists
        if (elements.adminModeBtn) {
            elements.adminModeBtn.addEventListener('click', toggleAdminMode);
            console.log('Admin mode button initialized');
        } else {
            console.log('Admin mode button not found');
        }

        // Check if user is admin and show admin controls
        checkAdminStatus();
    }

    // Function to check if user is admin and show admin controls
    function checkAdminStatus() {
        const username = localStorage.getItem('username');
        console.log('Current username from localStorage:', username);
        
        if (username === 'admin' && elements.adminControls) {
            console.log('Admin detected, showing admin controls');
            elements.adminControls.style.display = 'block';
        } else {
            console.log('Not admin or controls not found', {
                isAdmin: username === 'admin',
                controlsExist: !!elements.adminControls
            });
        }
    }
    
    // Function to toggle admin mode
    function toggleAdminMode() {
        adminMode = !adminMode;
        
        if (elements.adminModeBtn) {
            elements.adminModeBtn.textContent = adminMode ? 'Exit Admin Mode' : 'Admin Mode';
            elements.adminModeBtn.classList.toggle('active', adminMode);
        }
        
        console.log('Admin mode:', adminMode ? 'enabled' : 'disabled');
        
        // Refresh the post list to update admin controls
        loadPosts();
    }
    
    // Function to show forum content
    function showForumContent() {
        if (elements.forumContainer) {
            const content = elements.forumContainer.querySelector('.content');
            if (content) {
                // Get the navigation and post form if they exist
                const navLinks = content.querySelector('.navigation-links');
                const postFormContainer = content.querySelector('.post-form-window');
                
                // Clear the content while preserving navigation and post form
                if (navLinks && postFormContainer) {
                    content.innerHTML = '';
                    content.appendChild(navLinks);
                    content.appendChild(postFormContainer);
                    content.innerHTML += `
                        <div id="admin-controls" class="admin-panel" style="display: none;">
                            <button id="admin-mode" class="admin-btn">Admin Mode</button>
                            <button id="purge-posts" class="admin-btn">Purge All Posts</button>
                        </div>
                        <div id="postsList" class="posts-list">
                            <div class="loading-message">Loading posts...</div>
                        </div>
                    `;
                } else {
                    // If navigation and post form don't exist, just add the posts list
                    content.innerHTML = `
                        <div class="navigation-links theme-border">
                            [<a href="index.html">back</a>] [<a href="forum.html">refresh</a>] [<a href="#" id="toggle-post-form">new post</a>]
                        </div>
                        <div class="post-form-window" style="display: none;">
                            <div class="content">
                                <div class="post-form-container">
                                    <form id="postForm">
                                        <input type="text" id="threadSubject" placeholder="Subject (optional)" maxlength="100">
                                        <textarea id="postContent" placeholder="What's on your mind?" required></textarea>
                                        <div class="image-upload-container">
                                            <label for="postImage" class="image-upload-label">
                                                Add image
                                            </label>
                                            <input type="file" id="postImage" class="image-upload-input" accept="image/*">
                                            <div class="image-preview-container" id="imagePreviewContainer" style="display: none;">
                                                <img id="imagePreview" class="image-preview">
                                                <button type="button" id="removeImage" class="remove-image-btn">✕</button>
                                            </div>
                                        </div>
                                        <button type="submit" class="post-btn">Submit Post</button>
                                        <div id="post-response" class="post-response"></div>
                                    </form>
                                </div>
                            </div>
                        </div>
                        <div id="admin-controls" class="admin-panel" style="display: none;">
                            <button id="admin-mode" class="admin-btn">Admin Mode</button>
                            <button id="purge-posts" class="admin-btn">Purge All Posts</button>
                        </div>
                        <div id="postsList" class="posts-list">
                            <div class="loading-message">Loading posts...</div>
                        </div>
                    `;
                }
                
                // Refresh elements after DOM update
                reinitializeElements();
                
                // Add toggle functionality to the new button
                const toggleBtn = document.getElementById('toggle-post-form');
                if (toggleBtn) {
                    toggleBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        const postFormWindow = document.querySelector('.post-form-window');
                        if (postFormWindow) {
                            postFormWindow.style.display = postFormWindow.style.display === 'none' ? 'block' : 'none';
                        }
                    });
                }
                
                // Add purge button functionality
                const purgeBtn = document.getElementById('purge-posts');
                if (purgeBtn) {
                    purgeBtn.addEventListener('click', confirmPurgeAllPosts);
                    console.log('Purge button initialized');
                }

                // Show admin controls if the user is admin
                checkAdminStatus();
            }
        }
    }
    
    // Re-initialize elements after DOM changes
    function reinitializeElements() {
        // Re-get all elements
        elements.postForm = document.getElementById('postForm');
        elements.postContent = document.getElementById('postContent');
        elements.postResponse = document.getElementById('post-response');
        elements.postsList = document.getElementById('postsList');
        elements.adminControls = document.getElementById('admin-controls');
        elements.adminModeBtn = document.getElementById('admin-mode');
        
        // Set up event listener for form submission
        if (elements.postForm) {
            elements.postForm.addEventListener('submit', (e) => handleThreadSubmission(e, elements, API_URL, postsCache, addThreadToList));
        }
        
        // Set up admin mode button if it exists
        if (elements.adminModeBtn) {
            elements.adminModeBtn.addEventListener('click', toggleAdminMode);
            console.log('Admin mode button re-initialized');
        }
        
        // Reinitialize image upload handlers
        setupImageUploadHandlers();
    }
    
    async function loadPosts() {
        try {
            // Get the auth token
            const token = localStorage.getItem('authToken');
            if (!token) {
                // User not authenticated, don't load posts
                return;
            }
            
            // Show loading message
            if (elements.postsList) {
                elements.postsList.innerHTML = '<div class="loading-message">Loading threads...</div>';
            }
            
            console.log('Fetching posts from API...');
            
            // Log URL for debugging
            const postsUrl = `${API_URL}/api/forum/posts`;
            console.log('GET posts URL:', postsUrl);
            
            const response = await fetch(postsUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log('Raw GET posts response:', response);
            const responseClone = response.clone();
            
            try {
                const data = await response.json();
                console.log('API response for posts:', data, 'Status:', response.status);
                
                if (response.ok) {
                    // Cache the posts
                    postsCache = data.threads || [];
                    
                    if (elements.postsList) {
                        if (postsCache.length === 0) {
                            // No posts yet
                            elements.postsList.innerHTML = '<div class="empty-state">No threads yet. Be the first to post!</div>';
                        } else {
                            // Clear posts list
                            elements.postsList.innerHTML = '';
                            
                            // Add each thread to the list
                            postsCache.forEach(thread => {
                                addThreadToList(thread, elements, adminMode);
                            });
                        }
                    }
                } else {
                    // Error fetching posts
                    if (elements.postsList) {
                        elements.postsList.innerHTML = `<div class="loading-message error">Error loading posts: ${data.error || 'Unknown error'}</div>`;
                    }
                }
            } catch (jsonError) {
                console.error('Error parsing API response:', jsonError);
                const rawText = await responseClone.text();
                console.log('Raw response text:', rawText);
                
                if (elements.postsList) {
                    elements.postsList.innerHTML = '<div class="loading-message error">Error parsing server response</div>';
                }
            }
        } catch (error) {
            console.error('Error loading posts:', error);
            
            if (elements.postsList) {
                elements.postsList.innerHTML = `<div class="loading-message error">Error: ${error.message}</div>`;
            }
        }
    }
    
    // Refresh posts when the page becomes visible
    function setupPostRefresh() {
        // Only refresh when the page becomes visible again
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                console.log('Page visible, refreshing posts...');
                loadPosts();
            }
        });
    }

    // Make adminMode and postsCache available to imported admin functions
    window.forumState = {
        adminMode,
        postsCache,
        updateCache: (newCache) => {
            postsCache = newCache;
        }
    };

    // Make loadPosts available globally for the submission module
    window.loadPosts = loadPosts;
} 