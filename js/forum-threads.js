// Import utility functions from forum-utils.js
import { escapeHTML, processGreentextAndLinks, extractImageHtml, formatTimestamp } from './forum-utils.js';
// Import admin functions
import { deleteThread, deleteReply } from './forum-admin.js';

// Function to add a thread to the list
export function addThreadToList(thread, elements, adminMode) {
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
                ${thread.replies.map(reply => generateReplyHtml(reply, thread.id, adminMode)).join('')}
            </div>
        ` : '<div class="replies-container" data-thread-id="' + thread.id + '"></div>'}
        
        <button class="reply-toggle" onclick="document.getElementById('reply-form-${thread.id}').style.display = document.getElementById('reply-form-${thread.id}').style.display === 'none' || document.getElementById('reply-form-${thread.id}').style.display === '' ? 'block' : 'none'; return false;">[Reply]</button>
        
        <form id="reply-form-${thread.id}" class="reply-form" data-thread-id="${thread.id}">
            <textarea class="reply-content" placeholder="Write a reply..."></textarea>
            <div class="image-upload-container">
                <label for="replyImage-${thread.id}" class="image-upload-label">
                    [Add image]
                </label>
                <input type="file" id="replyImage-${thread.id}" class="image-upload-input" accept="image/*">
                <div class="image-preview-container" style="display: none;">
                    <img class="image-preview">
                    <button type="button" class="remove-image-btn">✕</button>
                </div>
            </div>
            <button type="submit" class="reply-btn">[Submit]</button>
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
        
        // Add event listeners for reply delete buttons
        const replyDeleteBtns = threadElement.querySelectorAll('.delete-reply-btn');
        replyDeleteBtns.forEach(deleteBtn => {
            deleteBtn.addEventListener('click', () => {
                const threadId = deleteBtn.getAttribute('data-thread-id');
                const replyId = deleteBtn.getAttribute('data-reply-id');
                deleteReply(threadId, replyId);
            });
        });
    }
}

// Generate HTML for a reply
export function generateReplyHtml(reply, threadId, adminMode) {
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
export function addReplyToThread(repliesContainer, reply, adminMode) {
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
    tempDiv.innerHTML = generateReplyHtml(reply, threadId, adminMode);
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

// Setup reply form functionality
export function setupReplyToggleAndForm(threadElement) {
    const replyForm = threadElement.querySelector('.reply-form');
    
    if (replyForm) {
        // Add event listener to the reply form
        replyForm.addEventListener('submit', handleReplySubmission);
        
        // Setup image upload handlers
        setupImageUploadHandlers(replyForm);
    }
}

// Setup image upload handlers
export function setupImageUploadHandlers(replyForm) {
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

// Event listener for reply submission
export async function handleReplySubmission(e) {
    e.preventDefault();
    
    const replyForm = e.target;
    const threadId = replyForm.dataset.threadId;
    const replyContent = replyForm.querySelector('.reply-content')?.value.trim() || '';
    
    // Check if user is logged in
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.error("User must be signed in to reply");
        return;
    }
    
    // Check for image attachment
    const replyImageInput = replyForm.querySelector('.reply-image-input');
    const imageFile = replyImageInput?.files?.[0];
    
    // Image validation
    if (imageFile) {
        // Check file size (max 100MB)
        const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes
        if (imageFile.size > MAX_FILE_SIZE) {
            console.error("Image file too large. Maximum size is 100MB.");
            return;
        }
        
        // Check file type
        if (!imageFile.type.startsWith('image/')) {
            console.error("Invalid file type. Only images are allowed.");
            return;
        }
    }
    
    // Require either content or an image
    if (!replyContent && !imageFile) {
        console.error("Please enter text or attach an image.");
        return;
    }
    
    try {
        // Log status to console instead of showing user message
        console.log("Submitting reply...");
        
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
        
        const API_URL = 'https://still-wood-forum-v2.jaidenschembri1.workers.dev';
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
        
        // Clear form
        replyForm.querySelector('.reply-content').value = '';
        
        // Reset image upload if it exists
        if (replyImageInput) {
            replyImageInput.value = '';
            const imagePreviewContainer = replyForm.querySelector('.image-preview-container');
            if (imagePreviewContainer) {
                imagePreviewContainer.style.display = 'none';
            }
        }
        
        // Log success to console instead of showing user message
        console.log("Reply submitted successfully!");
        
        // Add the new reply to the thread
        const repliesContainer = document.querySelector(`.replies-container[data-thread-id="${threadId}"]`);
        if (repliesContainer) {
            addReplyToThread(repliesContainer, data.reply, window.forumState?.adminMode);
            
            // Update the post in the cache
            const postIndex = window.forumState?.postsCache.findIndex(post => post.id == threadId);
            if (postIndex !== -1) {
                if (!window.forumState.postsCache[postIndex].replies) {
                    window.forumState.postsCache[postIndex].replies = [];
                }
                window.forumState.postsCache[postIndex].replies.push(data.reply);
            }
        }
    } catch (error) {
        console.error('Error submitting reply:', error);
        // Log error to console instead of showing user message
        console.error('Reply submission failed:', error.message || "Failed to submit reply. Please try again.");
    }
} 