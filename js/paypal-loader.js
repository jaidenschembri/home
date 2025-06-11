// PayPal SDK Dynamic Loader
import { paypalConfig } from './paypal-config.js';

class PayPalLoader {
    constructor() {
        this.isLoaded = false;
        this.isLoading = false;
        this.loadPromise = null;
    }

    // Load PayPal SDK dynamically
    async loadSDK() {
        // If already loaded, return immediately
        if (this.isLoaded && typeof window.paypal !== 'undefined') {
            return Promise.resolve();
        }

        // If currently loading, return the existing promise
        if (this.isLoading && this.loadPromise) {
            return this.loadPromise;
        }

        // Check if PayPal is configured
        if (!paypalConfig.isConfigured()) {
            throw new Error('PayPal is not configured. Please set your client IDs in paypal-config.js');
        }

        this.isLoading = true;
        
        this.loadPromise = new Promise((resolve, reject) => {
            // Remove any existing PayPal script
            const existingScript = document.querySelector('script[src*="paypal.com/sdk/js"]');
            if (existingScript) {
                existingScript.remove();
            }

            // Create new script element
            const script = document.createElement('script');
            script.src = paypalConfig.getSDKUrl();
            script.async = true;
            
            script.onload = () => {
                console.log(`PayPal SDK loaded successfully in ${paypalConfig.getEnvironment()} mode`);
                this.isLoaded = true;
                this.isLoading = false;
                resolve();
            };
            
            script.onerror = (error) => {
                console.error('Failed to load PayPal SDK:', error);
                this.isLoading = false;
                reject(new Error('Failed to load PayPal SDK'));
            };
            
            // Add script to document head
            document.head.appendChild(script);
        });

        return this.loadPromise;
    }

    // Check if PayPal SDK is ready
    isReady() {
        return this.isLoaded && typeof window.paypal !== 'undefined';
    }

    // Get PayPal instance (ensures it's loaded first)
    async getPayPal() {
        if (!this.isReady()) {
            await this.loadSDK();
        }
        return window.paypal;
    }

    // Reload SDK (useful when switching environments)
    async reloadSDK() {
        this.isLoaded = false;
        this.isLoading = false;
        this.loadPromise = null;
        return this.loadSDK();
    }
}

// Create and export singleton instance
export const paypalLoader = new PayPalLoader();

// Also export the class
export { PayPalLoader }; 