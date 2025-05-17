// Initialize forum functionality when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    initForum();
});

// Main forum initialization function
function initForum() {
    const API_URL = 'https://still-wood-forum-v2.jaidenschembri1.workers.dev';
    let postForm = document.getElementById('postForm');
    let postContent = document.getElementById('postContent');
    let postResponse = document.getElementById('post-response');
    let postsList = document.getElementById('postsList');
    const forumContainer = document.querySelector('.forum-container');
    const authModal = document.getElementById('auth-modal');
    const authOverlay = document.getElementById('auth-modal-overlay');

    // Check authentication on page load
    checkAuthentication();

    // Function to check if user is authenticated
    function checkAuthentication() {
        console.log("Checking authentication status");
        const token = localStorage.getItem('authToken');
        console.log("Token exists:", !!token);
        
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
                // User is authenticated - show forum content
                showForumContent();
                // Load posts
                loadPosts();
            } else {
                // Token is invalid - hide forum content and show login prompt
                localStorage.removeItem('authToken');
                showLoginPrompt();
            }
        })
        .catch(error => {
            console.error('Error validating token:', error);
            // Don't remove the token on network errors, just try to load content
            // if the token exists, since the user might be offline
            showForumContent();
            loadPosts();
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
    
    // Function to show auth modal (REMOVED - using existing functionality)
    
    // Function to show forum content
    function showForumContent() {
        console.log("Showing forum content");
        if (forumContainer) {
            const content = forumContainer.querySelector('.content');
            if (content) {
                content.innerHTML = `
                    <!-- Thread submission form -->
                    <div class="thread-form-container">
                        <div class="thread-form-header">Create New Thread</div>
                        <form id="postForm">
                            <input type="text" id="threadSubject" placeholder="Subject (optional)" maxlength="100">
                            <textarea id="postContent" placeholder="What's on your mind?" required></textarea>
                            <button type="submit" class="post-btn">Create Thread</button>
                            <div id="post-response" class="post-response"></div>
                        </form>
                    </div>

                    <!-- Posts container -->
                    <div id="postsList" class="threads-list">
                        <!-- Threads will be loaded here -->
                        <div class="loading-message">Loading threads...</div>
                    </div>
                `;
                
                // Re-initialize elements after recreating them
                reinitializeElements();
            }
        }
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

    // Event listener for thread submission
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
            
            const response = await fetch(`${API_URL}/api/forum/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ subject, content })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Clear form and show success message
                postContent.value = '';
                document.getElementById('threadSubject').value = '';
                postResponse.textContent = "Thread created successfully!";
                postResponse.className = "post-response success";
                
                // Add the new thread to the list
                addThreadToList(data.post);
                
                // Clear success message after 3 seconds
                setTimeout(() => {
                    postResponse.textContent = "";
                    postResponse.className = "post-response";
                }, 3000);
            } else {
                postResponse.textContent = data.error || "Failed to create thread. Please try again.";
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
    
    // Set up initial event listener if elements exist
    if (postForm) {
        postForm.addEventListener('submit', handleThreadSubmission);
    }

    // Function to load posts from the API
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
            
            const response = await fetch(`${API_URL}/api/forum/posts`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (!postsList) return;
            
            // Clear loading message
            postsList.innerHTML = '';
            
            if (response.ok && data.posts && data.posts.length > 0) {
                // Sort threads by timestamp (newest first)
                const sortedPosts = data.posts.sort((a, b) => {
                    return new Date(b.timestamp) - new Date(a.timestamp);
                });
                
                // Add each post to the list
                sortedPosts.forEach(post => {
                    addThreadToList(post);
                });
            } else {
                // Show empty state message
                postsList.innerHTML = '<div class="empty-state">No threads yet. Be the first to post!</div>';
            }
        } catch (error) {
            console.error('Error loading threads:', error);
            if (postsList) {
                postsList.innerHTML = `<div class="loading-message error">Error loading threads: ${error.message}</div>`;
            }
        }
    }

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
            
            // Count existing replies and update the header
            const replyCount = repliesContainer.querySelectorAll('.reply').length + 1; // +1 for the new reply
            repliesHeader.textContent = `${replyCount} ${replyCount === 1 ? 'Reply' : 'Replies'}`;
        }
        
        // Create new reply element
        const replyHtml = generateReplyHtml(reply);
        
        // Convert HTML to DOM element
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = replyHtml;
        const replyElement = tempDiv.firstChild;
        
        // Append the reply to the replies container
        repliesContainer.appendChild(replyElement);
    }

    // Helper function to escape HTML (prevent XSS)
    function escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    
    // Listen for auth changes and update the forum accordingly
    window.addEventListener('storage', (e) => {
        if (e.key === 'authToken') {
            console.log("Auth token changed in storage");
            // Token has changed, check authentication again
            checkAuthentication();
        }
    });
    
    // Add a global listener for successful login
    document.addEventListener('userLoggedIn', (e) => {
        console.log("User logged in event received", e.detail);
        checkAuthentication();
    });
} 