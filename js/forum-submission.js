// Thread submission and management functions for the forum

// Function to handle thread submission
export async function handleThreadSubmission(e, elements, API_URL, postsCache, addThreadToList) {
    e.preventDefault();
    
    // Check if user is logged in
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.error("User must be signed in to post");
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
    if (!content && !imageFile) {
        console.error("Please enter text or attach an image.");
        return;
    }
    
    try {
        // Log status to console instead of showing user message
        console.log("Creating thread...");
        
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
            // Clear form
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
            
            // Log success to console instead of showing user message
            console.log("Thread created successfully!");
            
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
            addThreadToList(newThread, elements, window.forumState?.adminMode || false);
            postsCache.unshift(newThread);
            
            // Reload posts after a short delay to confirm thread was saved
            setTimeout(() => {
                if (typeof window.loadPosts === 'function') {
                    window.loadPosts();
                }
            }, 1000);
        }
    } catch (error) {
        console.error('Error creating thread:', error);
        // Log error to console instead of showing user message
        console.error('Thread creation failed:', error.message);
    }
}

// Function to setup image upload handlers
export function setupImageUploadHandlers() {
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
} 