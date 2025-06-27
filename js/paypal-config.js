// PayPal Configuration Management
class PayPalConfig {
    constructor() {
        // Set this to false for sandbox/testing, true for live environment
        this.isProduction = false;
        
        // PayPal Client IDs
        this.clientIds = {
            sandbox: 'AbQn-fDDUqd-D7sEm2zY8Q6XwdcI5JqEvq1bWhPjpp_s_8SIR8WBZXez36Z5FR0TDGhbqk3VaQA0BuNU', // Your sandbox client ID
            production: 'AYtNdEqhVK8Umiz0_xB51Lyd_yMnLLBd0sN-Xm-pZlYtQmkFkMAhwYlb4EeBbqsNS1m23qQt3le5mTiI' 
        };
        
        // PayPal SDK URL configuration
        this.sdkOptions = {
            currency: 'USD',
            intent: 'capture',
            components: 'buttons',
            debug: false
        };
    }
    
    // Get the current client ID based on environment
    getClientId() {
        return this.isProduction ? this.clientIds.production : this.clientIds.sandbox;
    }
    
    // Get the current environment name
    getEnvironment() {
        return this.isProduction ? 'production' : 'sandbox';
    }
    
    // Get PayPal SDK URL with current configuration
    getSDKUrl() {
        const params = new URLSearchParams({
            'client-id': this.getClientId(),
            'currency': this.sdkOptions.currency,
            'intent': this.sdkOptions.intent,
            'components': this.sdkOptions.components,
            'enable-funding': 'card,credit',
            'disable-funding': 'venmo,paylater'
        });
        
        return `https://www.paypal.com/sdk/js?${params.toString()}`;
    }
    
    // Check if PayPal is properly configured
    isConfigured() {
        const clientId = this.getClientId();
        return clientId && !clientId.includes('YOUR_') && clientId.length > 10;
    }
    
    // Get button styling configuration
    getButtonStyle() {
        return {
            layout: 'vertical',
            color: 'blue',
            shape: 'rect',
            height: 45,
            tagline: false
        };
    }
    
    // Get advanced PayPal SDK options
    getAdvancedSDKOptions() {
        return {
            ...this.sdkOptions,
            // Add additional funding sources
            'enable-funding': 'venmo,paylater',
            // Disable funding sources you don't want
            'disable-funding': 'card,credit', // Remove if you want credit card options
            'buyer-country': 'US'
        };
    }
    
    // Get environment-specific logging configuration
    getLoggingConfig() {
        return {
            enabled: !this.isProduction, // Only log in sandbox
            level: this.isProduction ? 'error' : 'debug'
        };
    }
    
    // Log messages based on environment
    log(message, level = 'info', data = null) {
        const config = this.getLoggingConfig();
        
        if (!config.enabled && level !== 'error') {
            return;
        }
        
        const prefix = `[PayPal-${this.getEnvironment()}]`;
        
        switch (level) {
            case 'error':
                console.error(prefix, message, data);
                break;
            case 'warn':
                console.warn(prefix, message, data);
                break;
            case 'debug':
                if (config.level === 'debug') {
                    console.log(prefix, message, data);
                }
                break;
            default:
                console.log(prefix, message, data);
        }
    }
}

// Export a singleton instance
export const paypalConfig = new PayPalConfig();

// Also export the class for advanced usage
export { PayPalConfig }; 