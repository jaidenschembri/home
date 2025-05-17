// Initialize forum functionality when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    initForum();
});

// Main forum initialization function
function initForum() {
    const API_URL = 'https://still-wood-e0a1.jaidenschembri1.workers.dev';
    const postForm = document.getElementById('postForm');
    const postContent = document.getElementById('postContent');
    const postResponse = document.getElementById('post-response');
    const postsList = document.getElementById('postsList');

    // Load posts on page load
    loadPosts();

    // Event listener for post form submission
    if (postForm) {
        postForm.addEventListener('submit', async (e) => {
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
                postResponse.textContent = "Post content cannot be empty.";
                postResponse.className = "post-response error";
                return;
            }
            
            try {
                postResponse.textContent = "Submitting post...";
                postResponse.className = "post-response";
                
                const response = await fetch(`${API_URL}/api/forum/posts`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ content })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Clear form and show success message
                    postContent.value = '';
                    postResponse.textContent = "Post submitted successfully!";
                    postResponse.className = "post-response success";
                    
                    // Add the new post to the list
                    addPostToList(data.post);
                    
                    // Clear success message after 3 seconds
                    setTimeout(() => {
                        postResponse.textContent = "";
                        postResponse.className = "post-response";
                    }, 3000);
                } else {
                    postResponse.textContent = data.error || "Failed to submit post. Please try again.";
                    postResponse.className = "post-response error";
                }
            } catch (error) {
                console.error('Error submitting post:', error);
                postResponse.textContent = `Error: ${error.message}`;
                postResponse.className = "post-response error";
            }
        });
    }

    // Function to load posts from the API
    async function loadPosts() {
        try {
            // Show loading message
            postsList.innerHTML = '<div class="loading-message">Loading posts...</div>';
            
            const response = await fetch(`${API_URL}/api/forum/posts`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            // Clear loading message
            postsList.innerHTML = '';
            
            if (response.ok && data.posts && data.posts.length > 0) {
                // Sort posts by timestamp (newest first)
                const sortedPosts = data.posts.sort((a, b) => {
                    return new Date(b.timestamp) - new Date(a.timestamp);
                });
                
                // Add each post to the list
                sortedPosts.forEach(post => {
                    addPostToList(post);
                });
            } else {
                // Show empty state message
                postsList.innerHTML = '<div class="empty-state">No posts yet. Be the first to post!</div>';
            }
        } catch (error) {
            console.error('Error loading posts:', error);
            postsList.innerHTML = `<div class="loading-message error">Error loading posts: ${error.message}</div>`;
        }
    }

    // Function to add a post to the list
    function addPostToList(post) {
        // Create post element
        const postElement = document.createElement('div');
        postElement.className = 'post';
        
        // Format date
        const postDate = new Date(post.timestamp);
        const formattedDate = postDate.toLocaleString();
        
        // Set post HTML
        postElement.innerHTML = `
            <div class="post-header">
                <span class="post-username">${escapeHTML(post.username)}</span>
                <span class="post-timestamp">${formattedDate}</span>
            </div>
            <div class="post-content">${escapeHTML(post.content)}</div>
        `;
        
        // Add to the beginning of the list
        if (postsList.firstChild) {
            postsList.insertBefore(postElement, postsList.firstChild);
        } else {
            postsList.appendChild(postElement);
        }
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
} 