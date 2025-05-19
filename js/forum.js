// Import admin functions from forum-admin.js
import { deleteReply, deleteThread, confirmPurgeAllPosts, purgeAllPosts } from './forum-admin.js';
// Import utility functions from forum-utils.js
import { escapeHTML, processGreentextAndLinks, extractImageHtml, formatTimestamp } from './forum-utils.js';

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
    checkApiConnection();

    // Check authentication on page load
    checkAuthentication();
    
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
        const postImageInput = document.getElementById('postImage');
        const imagePreviewContainer = document.getElementById('imagePreviewContainer');
        const imagePreview = document.getElementById('imagePreview');
        const removeImageBtn = document.getElementById('removeImage');
        
        if (postImageInput && imagePreviewContainer && imagePreview && removeImageBtn) {
            // Handle image selection
            postImageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        imagePreview.src = event.target.result;
                        imagePreviewContainer.style.display = 'inline-block';
                    };
                    reader.readAsDataURL(file);
                }
            });
            
            // Handle image removal
            removeImageBtn.addEventListener('click', () => {
                postImageInput.value = '';
                imagePreview.src = '';
                imagePreviewContainer.style.display = 'none';
            });
        }
        
        // Debug tool initialization
        if (elements.checkApiBtn) {
            elements.checkApiBtn.addEventListener('click', checkApiConnection);
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
    
    // Function to check API connection
    async function checkApiConnection() {
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

    // Function to check if user is authenticated
    function checkAuthentication() {
        console.log("Checking authentication status");
        const token = localStorage.getItem('authToken');
        console.log("Token exists:", !!token);
        if (token) {
            // Log the first few characters of the token for debugging
            console.log("Token format check:", token.substring(0, 10) + "...");
        }
        
        if (!token) {
            // User is not authenticated - hide forum content and show login prompt
            showLoginPrompt();
            return false;
        }
        
        // Check if the user element exists in the header, which means user is logged in
        const signedInText = document.querySelector('.signed-in-text');
        const isDisplayed = signedInText && (window.getComputedStyle(signedInText).display !== 'none');
        console.log("Signed in text is displayed:", isDisplayed);
        
        if (isDisplayed) {
            // User is already verified as logged in by the main site code
            showForumContent();
            loadPosts();
            return true;
        }
        
        // If not immediately verified, check with the API
        console.log("Validating token with API");
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
            console.log("API validation response:", data);
            if (data.valid && data.user) {
                // Store username in localStorage for post ownership
                if (data.user.username) {
                    localStorage.setItem('username', data.user.username);
                    console.log("Username stored:", data.user.username);
                    
                    // Check admin status after username is set
                    checkAdminStatus();
                }
                
                // User is authenticated - show forum content
                showForumContent();
                // Load posts
                loadPosts();
            } else {
                // Token is invalid - hide forum content and show login prompt
                localStorage.removeItem('authToken');
                localStorage.removeItem('username');
                showLoginPrompt();
            }
        })
        .catch(error => {
            console.error('Error validating token:', error);
            // On network errors, show error message
            if (elements.forumContainer) {
                elements.forumContainer.querySelector('.content').innerHTML = `
                    <div class="error-message">
                        <p>Error connecting to server. Please try again later.</p>
                    </div>
                `;
            }
        });
    }

    // Function to show login prompt instead of forum content
    function showLoginPrompt() {
        if (elements.forumContainer) {
            elements.forumContainer.querySelector('.content').innerHTML = `
                <div class="window">
                    <div class="title-bar">
                        <span class="title-text">Forum</span>
                    </div>
                    <div class="content">
                        <div class="login-prompt">
                            <p>You must be signed in to view and participate in the forum.</p>
                            <button class="signin-prompt-btn">Sign In</button>
                        </div>
                    </div>
                </div>
            `;
            
            // Add event listener to the new sign in button
            const signInPromptBtn = document.querySelector('.signin-prompt-btn');
            if (signInPromptBtn) {
                signInPromptBtn.addEventListener('click', () => {
                    // Trigger click on the existing signin button
                    const existingSignInBtn = document.querySelector('.signin-btn');
                    if (existingSignInBtn) {
                        existingSignInBtn.click();
                    } else {
                        console.error('Signin button not found');
                    }
                });
            }
            
            // Listen for successful login event
            document.addEventListener('userLoggedIn', () => {
                console.log('Login detected! Loading forum content...');
                // Show forum content after successful login
                showForumContent();
                loadPosts();
                
                // Check admin status after login
                setTimeout(checkAdminStatus, 500);
            });
        }
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
            elements.postForm.addEventListener('submit', handleThreadSubmission);
        }
        
        // Set up admin mode button if it exists
        if (elements.adminModeBtn) {
            elements.adminModeBtn.addEventListener('click', toggleAdminMode);
            console.log('Admin mode button re-initialized');
        }
    }
    
    async function handleThreadSubmission(e) {
        e.preventDefault();
        
        // Check if user is logged in
        const token = localStorage.getItem('authToken');
        if (!token) {
            elements.postResponse.textContent = "You must be signed in to post.";
            elements.postResponse.className = "post-response error";
            return;
        }
        
        // Get post content
        const content = elements.postContent.value.trim();
        
        // Get subject (optional) 
        const subject = document.getElementById('threadSubject').value.trim();
        
        // Check for image attachment
        const postImageInput = document.getElementById('postImage');
        const imageFile = postImageInput?.files?.[0];
        
        // Image validation
        if (imageFile) {
            // Check file size (max 5MB)
            const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
            if (imageFile.size > MAX_FILE_SIZE) {
                elements.postResponse.textContent = "Image file is too large. Maximum size is 5MB.";
                elements.postResponse.className = "post-response error";
                return;
            }
            
            // Check file type
            if (!imageFile.type.startsWith('image/')) {
                elements.postResponse.textContent = "Invalid file type. Only images are allowed.";
                elements.postResponse.className = "post-response error";
                return;
            }
        }
        
        // Require either content or an image
        if (!content && !imageFile) {
            elements.postResponse.textContent = "Please enter text or attach an image.";
            elements.postResponse.className = "post-response error";
            return;
        }
        
        try {
            elements.postResponse.textContent = "Creating thread...";
            elements.postResponse.className = "post-response";
            
            // Create form data if we have an image
            let requestBody;
            let headers = {
                'Authorization': `Bearer ${token}`
            };
            
            if (imageFile) {
                // Use FormData for multipart/form-data (file upload)
                const formData = new FormData();
                formData.append('subject', subject);
                formData.append('content', content);
                formData.append('image', imageFile, imageFile.name); // Add filename
                
                console.log('Sending post with image:', {
                    subject: subject || '[no subject]',
                    contentLength: content.length,
                    imageSize: imageFile.size,
                    imageType: imageFile.type,
                    imageName: imageFile.name
                });
                
                requestBody = formData;
                // Don't set Content-Type header when using FormData - browser will set it with boundary
            } else {
                // No image - use regular JSON
                requestBody = JSON.stringify({ subject, content });
                headers['Content-Type'] = 'application/json';
            }
            
            console.log('Sending post to API with image:', !!imageFile);
            const response = await fetch(`${API_URL}/api/forum/posts`, {
                method: 'POST',
                headers,
                body: requestBody
            });
            
            console.log('Raw API response:', response);
            
            if (!response.ok) {
                let errorMessage = 'Failed to create thread';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.details || errorMessage;
                    console.error('API error response:', errorData);
                } catch (e) {
                    console.error('Error parsing error response:', e);
                }
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            console.log('API response for post creation:', data, 'Status:', response.status);
            
            if (response.ok) {
                // Clear form and show success message
                elements.postContent.value = '';
                document.getElementById('threadSubject').value = '';
                
                // Reset image upload if it exists
                if (postImageInput) {
                    postImageInput.value = '';
                    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
                    if (imagePreviewContainer) {
                        imagePreviewContainer.style.display = 'none';
                    }
                }
                
                elements.postResponse.textContent = "Thread created successfully!";
                elements.postResponse.className = "post-response success";
                
                // Add the new thread to the list and cache
                const newThread = data.thread || {
                    id: Date.now().toString(),
                    username: 'You',
                    subject: subject,
                    content: content,
                    timestamp: new Date().toISOString(),
                    imageUrl: data.thread?.imageUrl || null,
                    replies: []
                };
                
                console.log('Thread being added to UI:', newThread);
                addThreadToList(newThread);
                postsCache.unshift(newThread);
                
                // Clear success message after 3 seconds
                setTimeout(() => {
                    elements.postResponse.textContent = "";
                    elements.postResponse.className = "post-response";
                }, 3000);
                
                // Reload posts after a short delay to confirm thread was saved
                setTimeout(() => {
                    loadPosts();
                }, 1000);
            }
        } catch (error) {
            console.error('Error creating thread:', error);
            elements.postResponse.textContent = error.message;
            elements.postResponse.className = "post-response error";
        }
    }
    
    // Event listener for reply submission
    async function handleReplySubmission(e) {
        e.preventDefault();
        
        const replyForm = e.target;
        const threadId = replyForm.dataset.threadId;
        const replyContent = replyForm.querySelector('.reply-content')?.value.trim() || '';
        
        // Get response element, create it if it doesn't exist
        let replyResponse = replyForm.querySelector('.reply-response');
        if (!replyResponse) {
            replyResponse = document.createElement('div');
            replyResponse.className = 'reply-response';
            replyForm.appendChild(replyResponse);
        }
        
        // Check if user is logged in
        const token = localStorage.getItem('authToken');
        if (!token) {
            replyResponse.textContent = "You must be signed in to reply.";
            replyResponse.className = "post-response error";
            return;
        }
        
        // Check for image attachment
        const replyImageInput = replyForm.querySelector('.reply-image-input');
        const imageFile = replyImageInput?.files?.[0];
        
        // Image validation
        if (imageFile) {
            // Check file size (max 5MB)
            const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
            if (imageFile.size > MAX_FILE_SIZE) {
                replyResponse.textContent = "Image file is too large. Maximum size is 5MB.";
                replyResponse.className = "post-response error";
                return;
            }
            
            // Check file type
            if (!imageFile.type.startsWith('image/')) {
                replyResponse.textContent = "Invalid file type. Only images are allowed.";
                replyResponse.className = "post-response error";
                return;
            }
        }
        
        // Require either content or an image
        if (!replyContent && !imageFile) {
            replyResponse.textContent = "Please enter text or attach an image.";
            replyResponse.className = "post-response error";
            return;
        }
        
        try {
            replyResponse.textContent = "Submitting reply...";
            replyResponse.className = "post-response";
            
            // Create form data if we have an image
            let requestBody;
            let headers = {
                'Authorization': `Bearer ${token}`
            };
            
            if (imageFile) {
                // Use FormData for multipart/form-data (file upload)
                const formData = new FormData();
                formData.append('content', replyContent);
                formData.append('image', imageFile, imageFile.name); // Add filename
                
                console.log('Sending reply with image:', {
                    threadId,
                    contentLength: replyContent.length,
                    imageSize: imageFile.size,
                    imageType: imageFile.type,
                    imageName: imageFile.name
                });
                
                requestBody = formData;
                // Don't set Content-Type header when using FormData - browser will set it with boundary
            } else {
                // No image - use regular JSON
                requestBody = JSON.stringify({ content: replyContent });
                headers['Content-Type'] = 'application/json';
            }
            
            console.log(`Submitting reply to thread ${threadId}`);
            const response = await fetch(`${API_URL}/api/forum/posts/${threadId}/replies`, {
                method: 'POST',
                headers,
                body: requestBody
            });
            
            if (!response.ok) {
                let errorMessage = 'Failed to submit reply';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.details || errorMessage;
                } catch (e) {
                    console.error('Error parsing error response:', e);
                }
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            
            // Clear form and show success message
            replyForm.querySelector('.reply-content').value = '';
            
            // Reset image upload if it exists
            if (replyImageInput) {
                replyImageInput.value = '';
                const imagePreviewContainer = replyForm.querySelector('.image-preview-container');
                if (imagePreviewContainer) {
                    imagePreviewContainer.style.display = 'none';
                }
            }
            
            replyResponse.textContent = "Reply submitted successfully!";
            replyResponse.className = "post-response success";
            
            // Add the new reply to the thread
            const repliesContainer = document.querySelector(`.replies-container[data-thread-id="${threadId}"]`);
            if (repliesContainer) {
                addReplyToThread(repliesContainer, data.reply);
                
                // Update the post in the cache
                const postIndex = postsCache.findIndex(post => post.id == threadId);
                if (postIndex !== -1) {
                    if (!postsCache[postIndex].replies) {
                        postsCache[postIndex].replies = [];
                    }
                    postsCache[postIndex].replies.push(data.reply);
                }
            }
            
            // Clear success message after 3 seconds
            setTimeout(() => {
                replyResponse.textContent = "";
                replyResponse.className = "post-response";
            }, 3000);
        } catch (error) {
            console.error('Error submitting reply:', error);
            replyResponse.textContent = error.message || "Failed to submit reply. Please try again.";
            replyResponse.className = "post-response error";
        }
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
                                addThreadToList(thread);
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

    // Function to add a thread to the list
    function addThreadToList(thread) {
        if (!elements.postsList) return;
        
        // Create thread element
        const threadElement = document.createElement('div');
        threadElement.className = 'thread';
        threadElement.setAttribute('id', `thread-${thread.id}`);
        threadElement.setAttribute('data-thread-id', thread.id);
        
        // Format timestamp
        const formattedDate = formatTimestamp(thread.timestamp);
        
        // Process thread content for greentext
        const processedContent = processGreentextAndLinks(thread.content);
        
        // Check for attached image or image URL in content
        const imageHtml = extractImageHtml(thread.content, thread.imageUrl);
        
        // Create thread HTML
        threadElement.innerHTML = `
            <div class="post-header">
                <span class="post-username">${escapeHTML(thread.username)}</span> ${formattedDate}
                ${adminMode ? `<button class="delete-thread-btn" data-thread-id="${thread.id}">Delete</button>` : ''}
                ${thread.subject ? `<span class="thread-subject">${escapeHTML(thread.subject)}</span>` : ''}
            </div>
            <div class="post-content">
                ${imageHtml}${processedContent}
            </div>
            ${thread.replies && thread.replies.length > 0 ? `
                <div class="replies-container" data-thread-id="${thread.id}">
                    ${thread.replies.map(reply => generateReplyHtml(reply, thread.id)).join('')}
                </div>
            ` : '<div class="replies-container" data-thread-id="' + thread.id + '"></div>'}
            
            <button class="reply-toggle" onclick="document.getElementById('reply-form-${thread.id}').style.display = document.getElementById('reply-form-${thread.id}').style.display === 'none' || document.getElementById('reply-form-${thread.id}').style.display === '' ? 'block' : 'none'; return false;">Reply</button>
            
            <form id="reply-form-${thread.id}" class="reply-form" data-thread-id="${thread.id}">
                <textarea class="reply-content" placeholder="Write a reply..."></textarea>
                <div class="image-upload-container">
                    <label for="replyImage-${thread.id}" class="image-upload-label">
                        Add image
                    </label>
                    <input type="file" id="replyImage-${thread.id}" class="image-upload-input reply-image-input" accept="image/*">
                    <div class="image-preview-container" style="display: none;">
                        <img class="image-preview">
                        <button type="button" class="remove-image-btn">✕</button>
                    </div>
                </div>
                <button type="submit" class="reply-btn">Reply</button>
                <div class="reply-response"></div>
            </form>
        `;
        
        // Add the thread to the posts list
        elements.postsList.appendChild(threadElement);
        
        // Now that the element is in the DOM, add event listeners
        setupReplyToggleAndForm(threadElement);
        
        // Add admin controls if admin mode is enabled
        if (adminMode) {
            const deleteBtn = threadElement.querySelector('.delete-thread-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    if (confirm('Are you sure you want to delete this thread?')) {
                        deleteThread(thread.id);
                    }
                });
            }
        }
    }

    // Setup reply form functionality
    function setupReplyToggleAndForm(threadElement) {
        const replyForm = threadElement.querySelector('.reply-form');
        
        if (replyForm) {
            // Add event listener to the reply form
            replyForm.addEventListener('submit', handleReplySubmission);
            
            // Setup image upload handlers
            setupImageUploadHandlers(replyForm);
        }
    }
    
    // Setup image upload handlers
    function setupImageUploadHandlers(replyForm) {
        const replyImageInput = replyForm.querySelector('.reply-image-input');
        const replyImagePreviewContainer = replyForm.querySelector('.image-preview-container');
        const replyImagePreview = replyForm.querySelector('.image-preview');
        const removeReplyImageBtn = replyForm.querySelector('.remove-image-btn');
        
        if (replyImageInput && replyImagePreviewContainer && replyImagePreview && removeReplyImageBtn) {
            // Handle image selection
            replyImageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        replyImagePreview.src = event.target.result;
                        replyImagePreviewContainer.style.display = 'inline-block';
                    };
                    reader.readAsDataURL(file);
                }
            });
            
            // Handle image removal
            removeReplyImageBtn.addEventListener('click', () => {
                replyImageInput.value = '';
                replyImagePreview.src = '';
                replyImagePreviewContainer.style.display = 'none';
            });
        }
    }

    // Generate HTML for a reply
    function generateReplyHtml(reply, threadId) {
        // Format timestamp
        const formattedDate = formatTimestamp(reply.timestamp);
        
        // Process reply content for greentext
        const processedContent = processGreentextAndLinks(reply.content);
        
        // Check for attached image or image URL in content
        const imageHtml = extractImageHtml(reply.content, reply.imageUrl);
        
        return `
            <div class="reply" id="reply-${reply.id}">
                <div class="post-header">
                    <span class="post-username">${escapeHTML(reply.username)}</span> ${formattedDate}
                    ${adminMode ? `<button class="delete-reply-btn" data-thread-id="${threadId}" data-reply-id="${reply.id}">Delete Reply</button>` : ''}
                </div>
                <div class="post-content">
                    ${imageHtml}${processedContent}
                </div>
            </div>
        `;
    }
    
    // Function to add a reply to a thread
    function addReplyToThread(repliesContainer, reply) {
        // Update reply count header
        const repliesHeader = repliesContainer.querySelector('.replies-header');
        if (repliesHeader) {
            // Remove the no-replies class if it exists
            repliesHeader.classList.remove('no-replies');
            
            // Calculate the new count
            const currentReplies = repliesContainer.querySelectorAll('.reply').length;
            const newCount = currentReplies + 1;
            repliesHeader.textContent = `${newCount} ${newCount === 1 ? 'Reply' : 'Replies'}`;
        }
        
        // Get the thread ID from the container
        const threadId = repliesContainer.getAttribute('data-thread-id');
        
        // Create reply element from the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = generateReplyHtml(reply, threadId);
        const replyElement = tempDiv.firstElementChild;
        
        // Add event listener for delete button if in admin mode
        if (adminMode) {
            const deleteBtn = replyElement.querySelector('.delete-reply-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    const threadId = deleteBtn.getAttribute('data-thread-id');
                    const replyId = deleteBtn.getAttribute('data-reply-id');
                    deleteReply(threadId, replyId);
                });
            }
        }
        
        // Append to the end of the replies container
        repliesContainer.appendChild(replyElement);
    }

    // Make adminMode and postsCache available to imported admin functions
    window.forumState = {
        adminMode,
        postsCache,
        updateCache: (newCache) => {
            postsCache = newCache;
        }
    };
} 