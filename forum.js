// Initialize forum functionality when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    initForum();
});

// Main forum initialization function
function initForum() {
    const API_URL = 'https://still-wood-forum-v2.jaidenschembri1.workers.dev';
    console.log('Using API endpoint:', API_URL);
    
    let postForm = document.getElementById('postForm');
    let postContent = document.getElementById('postContent');
    let postResponse = document.getElementById('post-response');
    let postsList = document.getElementById('postsList');
    const forumContainer = document.querySelector('.forum-container');
    const authModal = document.getElementById('auth-modal');
    const authOverlay = document.getElementById('auth-modal-overlay');
    
    // Debug elements
    const apiStatus = document.getElementById('api-status');
    const checkApiBtn = document.getElementById('check-api');
    const adminModeBtn = document.getElementById('admin-mode');
    
    // Local cache for posts - will be synced with API
    let postsCache = [];
    // Admin mode flag
    let adminMode = false;
    
    // Debug tool initialization
    if (checkApiBtn) {
        checkApiBtn.addEventListener('click', checkApiConnection);
    }
    
    // Initialize admin mode button if it exists
    if (adminModeBtn) {
        adminModeBtn.addEventListener('click', toggleAdminMode);
    }
    
    // Function to toggle admin mode
    function toggleAdminMode() {
        adminMode = !adminMode;
        
        if (adminModeBtn) {
            adminModeBtn.textContent = adminMode ? 'Exit Admin Mode' : 'Admin Mode';
            adminModeBtn.classList.toggle('active', adminMode);
        }
        
        console.log('Admin mode:', adminMode ? 'enabled' : 'disabled');
        
        // Refresh the post list to update admin controls
        loadPosts();
    }
    
    // Function to check API connection
    async function checkApiConnection() {
        if (apiStatus) {
            apiStatus.textContent = 'Checking...';
            apiStatus.style.color = '#666';
        }
        
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                if (apiStatus) {
                    apiStatus.textContent = 'Not authenticated';
                    apiStatus.style.color = '#fa5252';
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
                if (apiStatus) {
                    apiStatus.textContent = 'Connected (API working)';
                    apiStatus.style.color = '#51cf66';
                }
                console.log('API connection successful');
            } else {
                if (apiStatus) {
                    apiStatus.textContent = 'Error: Authentication invalid';
                    apiStatus.style.color = '#fa5252';
                }
                console.log('API connection failed: Auth invalid');
            }
        } catch (error) {
            console.error('API connection check failed:', error);
            if (apiStatus) {
                apiStatus.textContent = `Error: ${error.message}`;
                apiStatus.style.color = '#fa5252';
            }
        }
    }
    
    // Check API connection on load
    checkApiConnection();

    // Check authentication on page load
    checkAuthentication();

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
            if (forumContainer) {
                forumContainer.querySelector('.content').innerHTML = `
                    <div class="error-message">
                        <p>Error connecting to server. Please try again later.</p>
                    </div>
                `;
            }
        });
    }

    // Function to show login prompt instead of forum content
    function showLoginPrompt() {
        if (forumContainer) {
            forumContainer.querySelector('.content').innerHTML = `
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
                        // Fallback if button not found
                        console.log("Sign in button not found, showing alert");
                        if (confirm("Please sign in to continue. Reload the page?")) {
                            window.location.reload();
                        }
                    }
                });
            }
        }
    }
    
    // Function to show forum content
    function showForumContent() {
        console.log("Showing forum content");
        // Update just the posts container, leave the form container as is
        if (forumContainer) {
            const content = forumContainer.querySelector('.content');
            if (content) {
                // Check if user is admin
                const isAdmin = localStorage.getItem('username') === 'admin';
                
                // Only show admin panel for admin users
                const adminPanel = isAdmin ? 
                    `<div class="admin-panel">
                        <h4>Admin Controls</h4>
                        <button id="admin-mode" class="admin-btn">Admin Mode</button>
                        <button id="purge-posts" class="admin-btn">Purge All Posts</button>
                    </div>` : '';
                
                content.innerHTML = `
                    ${adminPanel}
                    <!-- Posts container -->
                    <div id="postsList" class="threads-list">
                        <!-- Threads will be loaded here -->
                        <div class="loading-message">Loading threads...</div>
                    </div>
                `;
                
                // Initialize admin panel buttons only for admin users
                if (isAdmin) {
                    const adminModeBtn = document.getElementById('admin-mode');
                    const purgePostsBtn = document.getElementById('purge-posts');
                    
                    if (adminModeBtn) {
                        adminModeBtn.addEventListener('click', toggleAdminMode);
                    }
                    
                    if (purgePostsBtn) {
                        purgePostsBtn.addEventListener('click', confirmPurgeAllPosts);
                    }
                }
            }
        }
        
        // Re-initialize elements after recreating them
        reinitializeElements();
    }
    
    // Re-initialize elements after DOM changes
    function reinitializeElements() {
        // Re-get all elements
        const updatedPostForm = document.getElementById('postForm');
        const updatedPostContent = document.getElementById('postContent');
        const updatedPostResponse = document.getElementById('post-response');
        const updatedPostsList = document.getElementById('postsList');
        const updatedThreadSubject = document.getElementById('threadSubject');
        
        // Set up event listener for form submission
        if (updatedPostForm) {
            updatedPostForm.addEventListener('submit', handleThreadSubmission);
        }
        
        // Update global references
        if (updatedPostForm) postForm = updatedPostForm;
        if (updatedPostContent) postContent = updatedPostContent;
        if (updatedPostResponse) postResponse = updatedPostResponse;
        if (updatedPostsList) postsList = updatedPostsList;
    }
    
    async function handleThreadSubmission(e) {
        e.preventDefault();
        
        // Check if user is logged in
        const token = localStorage.getItem('authToken');
        if (!token) {
            postResponse.textContent = "You must be signed in to post.";
            postResponse.className = "post-response error";
            return;
        }
        
        // Get post content
        const content = postContent.value.trim();
        if (!content) {
            postResponse.textContent = "Thread content cannot be empty.";
            postResponse.className = "post-response error";
            return;
        }
        
        // Get subject (optional)
        const subject = document.getElementById('threadSubject').value.trim();
        
        try {
            postResponse.textContent = "Creating thread...";
            postResponse.className = "post-response";
            
            console.log('Sending post to API:', { subject, content });
            const response = await fetch(`${API_URL}/api/forum/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ subject, content })
            });
            
            console.log('Raw API response:', response);
            const responseClone = response.clone();
            
            try {
                const data = await response.json();
                console.log('API response for post creation:', data, 'Status:', response.status);
                
                if (response.ok) {
                    // Clear form and show success message
                    postContent.value = '';
                    document.getElementById('threadSubject').value = '';
                    postResponse.textContent = "Thread created successfully!";
                    postResponse.className = "post-response success";
                    
                    // Add the new thread to the list and cache
                    const newThread = data.thread || {
                        id: Date.now().toString(),
                        username: 'You',
                        subject: subject,
                        content: content,
                        timestamp: new Date().toISOString(),
                        replies: []
                    };
                    
                    console.log('Thread being added to UI:', newThread);
                    addThreadToList(newThread);
                    postsCache.unshift(newThread);
                    
                    // Clear success message after 3 seconds
                    setTimeout(() => {
                        postResponse.textContent = "";
                        postResponse.className = "post-response";
                    }, 3000);
                    
                    // Reload posts after a short delay to confirm thread was saved
                    setTimeout(() => {
                        loadPosts();
                    }, 1000);
                } else {
                    console.error('API error response:', data);
                    postResponse.textContent = data.error || "Failed to create thread. Please try again.";
                    postResponse.className = "post-response error";
                }
            } catch (jsonError) {
                console.error('Error parsing API response:', jsonError);
                const rawText = await responseClone.text();
                console.log('Raw response text:', rawText);
                postResponse.textContent = `Error: Could not parse server response`;
                postResponse.className = "post-response error";
            }
        } catch (error) {
            console.error('Error creating thread:', error);
            postResponse.textContent = `Error: ${error.message}`;
            postResponse.className = "post-response error";
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
        
        try {
            replyResponse.textContent = "Submitting reply...";
            replyResponse.className = "post-response";
            
            const response = await fetch(`${API_URL}/api/forum/posts/${threadId}/replies`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content: replyContent })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Clear form and show success message
                replyForm.querySelector('.reply-content').value = '';
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
            if (postsList) {
                postsList.innerHTML = '<div class="loading-message">Loading threads...</div>';
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
                console.log('API response for posts:', data);
                
                if (!postsList) return;
                
                // Clear loading message
                postsList.innerHTML = '';
                
                if (response.ok && data.threads && data.threads.length > 0) {
                    console.log(`Loaded ${data.threads.length} posts successfully from API`);
                    // Sort threads by timestamp (newest first)
                    postsCache = data.threads.sort((a, b) => {
                        return new Date(b.timestamp) - new Date(a.timestamp);
                    });
                    
                    // Add each post to the list
                    postsCache.forEach(post => {
                        addThreadToList(post);
                    });
                } else {
                    console.log('No posts returned from API or error occurred', response.status);
                    // Show empty state message
                    postsList.innerHTML = '<div class="empty-state">No threads yet. Be the first to post!</div>';
                }
            } catch (jsonError) {
                console.error('Error parsing GET posts response:', jsonError);
                const rawText = await responseClone.text();
                console.log('Raw GET posts response text:', rawText);
                if (postsList) {
                    postsList.innerHTML = `<div class="loading-message error">Error loading threads: Could not parse server response</div>`;
                }
            }
        } catch (error) {
            console.error('Error loading threads:', error);
            if (postsList) {
                postsList.innerHTML = `<div class="loading-message error">Error loading threads: ${error.message}</div>`;
            }
        }
    }
    
    // Periodically refresh posts to keep them current
    function setupPostRefresh() {
        // Refresh posts every 1 minute
        setInterval(() => {
            if (document.visibilityState === 'visible') {
                console.log('Refreshing posts...');
                loadPosts();
            }
        }, 60000); // 1 minute
        
        // Also refresh when the page becomes visible again
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                console.log('Page visible, refreshing posts...');
                loadPosts();
            }
        });
    }
    
    // Call setup refresh function
    setupPostRefresh();

    // Function to add a thread to the list
    function addThreadToList(thread) {
        if (!postsList) return;
        
        // Create thread element
        const threadElement = document.createElement('div');
        threadElement.className = 'thread';
        threadElement.dataset.threadId = thread.id;
        
        // Format date
        const threadDate = new Date(thread.timestamp);
        const formattedDate = threadDate.toLocaleString();
        
        // Build subject HTML
        const subjectHtml = thread.subject ? 
            `<span class="thread-subject">${escapeHTML(thread.subject)}</span>` : '';
        
        // Admin controls - only for admin mode, no user delete buttons
        const isAdmin = localStorage.getItem('username') === 'admin';
        const adminControls = isAdmin && adminMode ? 
            `<div class="thread-admin-controls">
                <button class="delete-thread-btn" data-thread-id="${thread.id}">Delete</button>
            </div>` : '';
        
        // Set thread HTML
        threadElement.innerHTML = `
            <div class="thread-post">
                <div class="post-header">
                    <div class="post-info">
                        <span class="post-username">${escapeHTML(thread.username)}</span>
                        <span class="post-id">No.${thread.id}</span>
                        ${subjectHtml}
                    </div>
                    <span class="post-timestamp">${formattedDate}</span>
                </div>
                <div class="post-content">${escapeHTML(thread.content)}</div>
                ${adminControls}
            </div>
            
            <div class="reply-form-container">
                <form class="reply-form" data-thread-id="${thread.id}">
                    <textarea class="reply-content" placeholder="Write a reply..." required></textarea>
                    <button type="submit" class="reply-btn">Reply</button>
                    <div class="reply-response post-response"></div>
                </form>
            </div>
            
            <div class="replies-container" data-thread-id="${thread.id}">
                ${thread.replies && thread.replies.length > 0 ? 
                    `<div class="replies-header">${thread.replies.length} ${thread.replies.length === 1 ? 'Reply' : 'Replies'}</div>` : 
                    '<div class="replies-header no-replies">No Replies Yet</div>'}
                ${thread.replies && thread.replies.length > 0 ? 
                    thread.replies.map(reply => generateReplyHtml(reply)).join('') : ''}
            </div>
        `;
        
        // Add to the beginning of the list
        if (postsList.firstChild) {
            postsList.insertBefore(threadElement, postsList.firstChild);
        } else {
            postsList.appendChild(threadElement);
        }
        
        // Add event listener to the reply form
        const replyForm = threadElement.querySelector('.reply-form');
        if (replyForm) {
            replyForm.addEventListener('submit', handleReplySubmission);
        }
        
        // Add event listener to delete button if present (admin only)
        const deleteBtn = threadElement.querySelector('.delete-thread-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deleteThread(thread.id));
        }
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
    
    // Generate HTML for a reply
    function generateReplyHtml(reply) {
        // Format date
        const replyDate = new Date(reply.timestamp);
        const formattedDate = replyDate.toLocaleString();
        
        return `
            <div class="reply" data-reply-id="${reply.id}">
                <div class="post-header">
                    <div class="post-info">
                        <span class="post-username">${escapeHTML(reply.username)}</span>
                        <span class="post-id">No.${reply.id}</span>
                    </div>
                    <span class="post-timestamp">${formattedDate}</span>
                </div>
                <div class="post-content">${escapeHTML(reply.content)}</div>
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
    
    // Escape HTML to prevent XSS
    function escapeHTML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
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
                if (postsList) {
                    postsList.innerHTML = '<div class="empty-state">No threads yet. Be the first to post!</div>';
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