// Initialize shop functionality when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    initShop();
});

// Global reference to shop functionality
window.shopFunctions = {};

// Main shop initialization function
function initShop() {
    const API_URL = 'https://still-wood-forum-v2.jaidenschembri1.workers.dev';
    console.log('Using API endpoint:', API_URL);
    
    // DOM elements
    const elements = {
        shopContent: document.getElementById('shopContent'),
        shopContainer: document.querySelector('.shop-container')
    };
    
    // Local cache for shop items - will be synced with API when implemented
    let shopItemsCache = [];
    
    // Check authentication on page load
    checkAuthentication();
    
    // Function to check if user is authenticated
    function checkAuthentication() {
        console.log("Checking authentication status");
        const token = localStorage.getItem('authToken');
        console.log("Token exists:", !!token);
        
        if (!token) {
            // User is not authenticated - hide shop content and show login prompt
            showLoginPrompt();
            return false;
        }
        
        // Check if the user element exists in the header, which means user is logged in
        const signedInText = document.querySelector('.signed-in-text');
        const isDisplayed = signedInText && (window.getComputedStyle(signedInText).display !== 'none');
        console.log("Signed in text is displayed:", isDisplayed);
        
        if (isDisplayed) {
            // User is already verified as logged in by the main site code
            showShopContent();
            loadShopItems();
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
                // Store username in localStorage
                if (data.user.username) {
                    localStorage.setItem('username', data.user.username);
                    console.log("Username stored:", data.user.username);
                }
                
                // User is authenticated - show shop content
                showShopContent();
                // Load shop items
                loadShopItems();
            } else {
                // Token is invalid - hide shop content and show login prompt
                localStorage.removeItem('authToken');
                localStorage.removeItem('username');
                showLoginPrompt();
            }
        })
        .catch(error => {
            console.error('Error validating token:', error);
            // On network errors, show error message
            if (elements.shopContainer) {
                elements.shopContainer.querySelector('.content').innerHTML = `
                    <div class="error-message">
                        <p>Error connecting to server. Please try again later.</p>
                    </div>
                `;
            }
        });
    }

    // Function to show login prompt instead of shop content
    function showLoginPrompt() {
        if (elements.shopContainer) {
            elements.shopContainer.querySelector('.content').innerHTML = `
                <div class="login-prompt">
                    <p>You must be signed in to view and shop in the store.</p>
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
                console.log('Login detected! Loading shop content...');
                // Show shop content after successful login
                showShopContent();
                loadShopItems();
            });
        }
    }

    // Function to show shop content when authenticated
    function showShopContent() {
        if (elements.shopContainer) {
            // Create basic structure if it doesn't exist
            elements.shopContainer.querySelector('.content').innerHTML = `
                <div class="navigation-links theme-border">
                    [<a href="index.html">back</a>] [<a href="#" id="cart-icon" title="Shopping Cart">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" class="cart-icon">
                        <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 3h2l3.6 7.6L5.3 12c-.1.3-.3.7-.3 1 0 1.1.9 2 2 2h12v-2H7.4c-.1 0-.2-.1-.2-.2v-.1l.9-1.7h7.4c.7 0 1.4-.4 1.7-1l3.6-6.5c.2-.3.2-.6.1-.9-.1-.3-.5-.6-.9-.6H5.2L4.3 2H1v1zm16 15c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                      </svg>
                    </a>]
                </div>
                <div id="shopContent" class="shop-content">
                    <div class="loading-message">Loading shop items...</div>
                </div>
            `;

            // Update elements reference after DOM change
            elements.shopContent = document.getElementById('shopContent');
            
            // Ensure the navigation links are visible
            const navLinks = elements.shopContainer.querySelector('.navigation-links');
            if (navLinks) {
                navLinks.style.display = 'block';
            }
            
            // Make sure the shop content container is visible
            if (elements.shopContent) {
                elements.shopContent.style.display = 'block';
            }
        }
    }

    // Function to load shop items - exposed globally
    window.loadShopItems = loadShopItems;
    function loadShopItems() {
        // In a real app, this would fetch from an API
        // For now, we'll use placeholder data
        
        // Show loading message
        if (elements.shopContent) {
            elements.shopContent.innerHTML = '<div class="loading-message">Loading shop items...</div>';
        }
        
        // Simulating API delay
        setTimeout(() => {
            // Demo shop items
            const shopItems = [
                {
                    id: 1,
                    name: 'T-Shirt',
                    description: 'A comfortable cotton t-shirt with our logo',
                    price: 19.99,
                    image: 'images/placeholder.jpg'
                },
                {
                    id: 2,
                    name: 'Hoodie',
                    description: 'Stay warm with our premium hoodie',
                    price: 39.99,
                    image: 'images/placeholder.jpg'
                },
                {
                    id: 3,
                    name: 'Sticker Pack',
                    description: 'Set of 5 vinyl stickers',
                    price: 9.99,
                    image: 'images/placeholder.jpg'
                }
            ];
            
            // Cache the items
            shopItemsCache = shopItems;
            
            // Display the items
            displayShopItems(shopItems);
        }, 1000);
    }

    // Function to display shop items
    function displayShopItems(items) {
        if (!elements.shopContent) return;
        
        if (items.length === 0) {
            elements.shopContent.innerHTML = `
                <div class="empty-state">
                    <p>No items available at this time.</p>
                </div>
            `;
            return;
        }
        
        // Create HTML for the shop items
        let html = '<div class="shop-items">';
        
        items.forEach(item => {
            html += `
                <div class="shop-item" data-id="${item.id}">
                    <div class="shop-item-image">
                        <img src="${item.image}" alt="${item.name}">
                    </div>
                    <div class="shop-item-details">
                        <h3 class="shop-item-name">${item.name}</h3>
                        <p class="shop-item-description">${item.description}</p>
                        <div class="shop-item-price">$${item.price.toFixed(2)}</div>
                        <button class="add-to-cart-btn" data-id="${item.id}">Add to Cart</button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        // Update the DOM
        elements.shopContent.innerHTML = html;
        
        // Add event listeners to the add to cart buttons
        const addToCartBtns = document.querySelectorAll('.add-to-cart-btn');
        addToCartBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const itemId = parseInt(this.getAttribute('data-id'));
                addToCart(itemId);
            });
        });
    }

    // Function to add an item to the cart
    function addToCart(itemId) {
        // Find the item in our cache
        const item = shopItemsCache.find(item => item.id === itemId);
        
        if (!item) {
            console.error('Item not found in cache');
            return;
        }
        
        // In a real app, you would add this to a cart in localStorage or send to an API
        console.log('Added to cart:', item);
        
        // For now, just show an alert
        alert(`Added ${item.name} to cart!`);
    }
} 