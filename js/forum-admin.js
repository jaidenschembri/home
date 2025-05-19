// Forum admin functionality
const API_URL = 'https://still-wood-forum-v2.jaidenschembri1.workers.dev';

// Function to get forum state
function getForumState() {
    return window.forumState || { adminMode: false, postsCache: [] };
}

// Function to delete a reply
async function deleteReply(threadId, replyId) {
    // Verify user is admin
    const username = localStorage.getItem('username');
    if (username !== 'admin') {
        console.error('Unauthorized delete attempt');
        alert('Only admin can delete replies');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this reply? This action cannot be undone.')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            alert('You must be logged in as admin to delete replies');
            return;
        }
        
        console.log(`Deleting reply: ${replyId} from thread: ${threadId}`);
        
        const deleteUrl = `${API_URL}/api/forum/posts/${threadId}/replies/${replyId}`;
        console.log(`Sending DELETE request to: ${deleteUrl}`);
        
        const response = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log(`Delete response status: ${response.status}`);
        
        if (response.ok) {
            // Remove reply from UI
            const replyElement = document.getElementById(`reply-${replyId}`);
            if (replyElement) {
                replyElement.remove();
            }
            
            // Update cache
            const forumState = getForumState();
            const threadIndex = forumState.postsCache.findIndex(post => post.id === threadId);
            if (threadIndex !== -1) {
                forumState.postsCache[threadIndex].replies = forumState.postsCache[threadIndex].replies.filter(reply => reply.id !== replyId);
                forumState.updateCache(forumState.postsCache);
            }
            
            console.log(`Reply ${replyId} deleted successfully`);
            alert('Reply deleted successfully');
        } else {
            const errorData = await response.json();
            alert(`Error deleting reply: ${errorData.error || 'Unknown error'}`);
            console.error('Error deleting reply:', errorData);
        }
    } catch (error) {
        alert(`Error deleting reply: ${error.message}`);
        console.error('Error deleting reply:', error);
    }
}

// Function to delete a thread (admin only)
async function deleteThread(threadId) {
    // Verify user is admin
    const username = localStorage.getItem('username');
    if (username !== 'admin') {
        console.error('Unauthorized delete attempt');
        alert('Only admin can delete threads');
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
                const threadElement = document.getElementById(`thread-${threadId}`);
                if (threadElement) {
                    threadElement.remove();
                }
                
                // Update cache
                const forumState = getForumState();
                const newCache = forumState.postsCache.filter(post => post.id !== threadId);
                forumState.updateCache(newCache);
                
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
            // Update cache
            const forumState = getForumState();
            forumState.updateCache([]);
            
            // Clear the posts list
            const postsList = document.getElementById('postsList');
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

// Export functions for use in forum.js
export {
    deleteReply,
    deleteThread,
    confirmPurgeAllPosts,
    purgeAllPosts
}; 