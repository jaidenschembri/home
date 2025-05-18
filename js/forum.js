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
        adminModeBtn: document.getElementById('admin-mode')
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
                <div class="login-prompt">
                    <p>You must be signed in to view and participate in the forum.</p>
                    <button class="signin-prompt-btn">Sign In</button>
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
                        <div id="postsList" class="posts-list">
                            <div class="loading-message">Loading posts...</div>
                        </div>
                    `;
                } else {
                    // If navigation and post form don't exist, just add the posts list
                    content.innerHTML = `
                        <div class="navigation-links">
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
        
        // Set up event listener for form submission
        if (elements.postForm) {
            elements.postForm.addEventListener('submit', handleThreadSubmission);
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
        if (!content) {
            elements.postResponse.textContent = "Thread content cannot be empty.";
            elements.postResponse.className = "post-response error";
            return;
        }
        
        // Get subject (optional)
        const subject = document.getElementById('threadSubject').value.trim();
        
        // Check for image attachment
        const postImageInput = document.getElementById('postImage');
        const imageFile = postImageInput?.files?.[0];
        
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
                formData.append('image', imageFile);
                
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
            const responseClone = response.clone();
            
            try {
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
                } else {
                    console.error('API error response:', data);
                    elements.postResponse.textContent = data.error || "Failed to create thread. Please try again.";
                    elements.postResponse.className = "post-response error";
                }
            } catch (jsonError) {
                console.error('Error parsing API response:', jsonError);
                const rawText = await responseClone.text();
                console.log('Raw response text:', rawText);
                elements.postResponse.textContent = `Error: Could not parse server response`;
                elements.postResponse.className = "post-response error";
            }
        } catch (error) {
            console.error('Error creating thread:', error);
            elements.postResponse.textContent = `Error: ${error.message}`;
            elements.postResponse.className = "post-response error";
        }
    }
    
    // Event listener for reply submission
    async function handleReplySubmission(e) {
        e.preventDefault();
        
        const replyForm = e.target;
        const threadId = replyForm.dataset.threadId;
        const replyContent = replyForm.querySelector('.reply-content').value.trim();
        const replyResponse = replyForm.querySelector('.reply-response');
        
        // Check if user is logged in
        const token = localStorage.getItem('authToken');
        if (!token) {
            replyResponse.textContent = "You must be signed in to reply.";
            replyResponse.className = "post-response error";
            return;
        }
        
        // Check content
        if (!replyContent) {
            replyResponse.textContent = "Reply content cannot be empty.";
            replyResponse.className = "post-response error";
            return;
        }
        
        // Check for image attachment
        const replyImageInput = replyForm.querySelector('.reply-image-input');
        const imageFile = replyImageInput?.files?.[0];
        
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
                formData.append('image', imageFile);
                
                requestBody = formData;
                // Don't set Content-Type header when using FormData - browser will set it with boundary
            } else {
                // No image - use regular JSON
                requestBody = JSON.stringify({ content: replyContent });
                headers['Content-Type'] = 'application/json';
            }
            
            const response = await fetch(`${API_URL}/api/forum/posts/${threadId}/replies`, {
                method: 'POST',
                headers,
                body: requestBody
            });
            
            const data = await response.json();
            
            if (response.ok) {
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
            } else {
                replyResponse.textContent = data.error || "Failed to submit reply. Please try again.";
                replyResponse.className = "post-response error";
            }
        } catch (error) {
            console.error('Error submitting reply:', error);
            replyResponse.textContent = `Error: ${error.message}`;
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
                            
                            // After adding all posts, add event listeners to all reply forms
                            document.querySelectorAll('.reply-form').forEach(form => {
                                form.addEventListener('submit', handleReplySubmission);
                                
                                // Add image upload handlers to each reply form
                                const replyImageInput = form.querySelector('.reply-image-input');
                                const replyImagePreviewContainer = form.querySelector('.image-preview-container');
                                const replyImagePreview = form.querySelector('.image-preview');
                                const removeReplyImageBtn = form.querySelector('.remove-image-btn');
                                
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

    // Helper function: Escape HTML to prevent XSS
    function escapeHTML(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    // Helper function: Process text for greentext and links
    function processGreentextAndLinks(text) {
        if (!text) return '';
        
        // Escape HTML first
        let processed = escapeHTML(text);
        
        // Process greentext (lines starting with >)
        processed = processed.replace(/^(&gt;.*)$/gm, '<span class="greentext">$1</span>');
        
        // Replace URLs with links
        processed = processed.replace(
            /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g, 
            '<a href="$1" target="_blank">$1</a>'
        );
        
        return processed;
    }
    
    // Helper function: Extract image URL from content if it exists
    function extractImageHtml(content, imageUrl = null) {
        // First check if we have a direct image URL from the server (attached image)
        if (imageUrl) {
            return `<img src="${escapeHTML(imageUrl)}" class="post-image" onclick="window.open(this.src, '_blank')">`;
        }
        
        // Otherwise, look for image URLs in the content
        if (!content) return '';
        
        // Find image URL in content (basic pattern matching)
        const imgMatch = content.match(/(https?:\/\/.*?\.(?:png|jpg|jpeg|gif|webp))/i);
        if (imgMatch) {
            return `<img src="${escapeHTML(imgMatch[0])}" class="post-image" onclick="window.open(this.src, '_blank')">`;
        }
        
        return '';
    }
    
    // Format timestamp helper
    function formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
    }

    // Function to add a thread to the list
    function addThreadToList(thread) {
        if (!elements.postsList) return;
        
        // Create thread element
        const threadElement = document.createElement('div');
        threadElement.className = 'thread';
        threadElement.setAttribute('id', `thread-${thread.id}`);
        
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
                    ${thread.replies.map(reply => generateReplyHtml(reply)).join('')}
                </div>
            ` : '<div class="replies-container" data-thread-id="' + thread.id + '"></div>'}
            
            <form class="reply-form" data-thread-id="${thread.id}">
                <textarea class="reply-content" placeholder="Write a reply..." required></textarea>
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
        
        // Add event listener to the reply form
        const replyForm = threadElement.querySelector('.reply-form');
        if (replyForm) {
            replyForm.addEventListener('submit', handleReplySubmission);
            
            // Add image upload handlers
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
        
        // Add thread to list
        elements.postsList.appendChild(threadElement);
    }

    // Generate HTML for a reply
    function generateReplyHtml(reply) {
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
                </div>
                <div class="post-content">
                    ${imageHtml}${processedContent}
                </div>
            </div>
        `;
    }
    
    // Add a reply to a thread
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
        
        // Create reply element from the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = generateReplyHtml(reply);
        const replyElement = tempDiv.firstElementChild;
        
        // Append to the end of the replies container
        repliesContainer.appendChild(replyElement);
    }
    
    // Function to delete a thread (admin only)
    async function deleteThread(threadId) {
        // Verify user is admin
        const username = localStorage.getItem('username');
        if (username !== 'admin') {
            console.error('Unauthorized delete attempt');
            return;
        }
        
        if (!confirm('Are you sure you want to delete this thread? This action cannot be undone.')) {
            return;
        }
        
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                alert('You must be logged in as admin to delete threads');
                return;
            }
            
            console.log(`Deleting thread: ${threadId}`);
            
            // Log the full URL for debugging
            const deleteUrl = `${API_URL}/api/forum/posts/${threadId}`;
            console.log(`Sending DELETE request to: ${deleteUrl}`);
            
            const response = await fetch(deleteUrl, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log(`Delete response status: ${response.status}`);
            
            // Clone response for potential second read
            const responseClone = response.clone();
            
            try {
                const data = await response.json();
                console.log('Delete response data:', data);
                
                if (response.ok) {
                    // Remove thread from UI
                    const threadElement = document.querySelector(`.thread[data-thread-id="${threadId}"]`);
                    if (threadElement) {
                        threadElement.remove();
                    }
                    
                    // Remove from cache
                    postsCache = postsCache.filter(post => post.id !== threadId);
                    
                    console.log(`Thread ${threadId} deleted successfully`);
                    alert('Thread deleted successfully');
                } else {
                    alert(`Error deleting thread: ${data.error || 'Unknown error'}`);
                    console.error('Error deleting thread:', data);
                }
            } catch (jsonError) {
                console.error('Error parsing JSON response:', jsonError);
                try {
                    const textResponse = await responseClone.text();
                    console.log('Raw response text:', textResponse);
                    alert(`Error deleting thread: Could not parse server response`);
                } catch (textError) {
                    console.error('Error reading response text:', textError);
                    alert(`Error deleting thread: Server responded with status ${response.status}`);
                }
            }
        } catch (error) {
            alert(`Error deleting thread: ${error.message}`);
            console.error('Error deleting thread:', error);
        }
    }
    
    // Function to confirm and purge all posts (admin only)
    async function confirmPurgeAllPosts() {
        // Verify user is admin
        const username = localStorage.getItem('username');
        if (username !== 'admin') {
            console.error('Unauthorized purge attempt');
            return;
        }
        
        if (confirm('WARNING: This will permanently delete ALL forum posts. This action cannot be undone. Continue?')) {
            if (confirm('Are you ABSOLUTELY SURE? This is your last chance to cancel.')) {
                await purgeAllPosts();
            }
        }
    }
    
    // Function to purge all posts
    async function purgeAllPosts() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                alert('You must be logged in as admin to purge posts');
                return;
            }
            
            console.log('Purging all posts...');
            const response = await fetch(`${API_URL}/api/forum/posts/purge`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                alert('All posts have been purged successfully.');
                postsCache = [];
                if (elements.postsList) {
                    elements.postsList.innerHTML = '<div class="empty-state">No threads yet. Be the first to post!</div>';
                }
            } else {
                const errorData = await response.json();
                alert(`Error purging posts: ${errorData.error || 'Permission denied'}`);
            }
        } catch (error) {
            console.error('Error purging posts:', error);
            alert(`Error: ${error.message}`);
        }
    }
} 