// PayPal Configuration Management
class PayPalConfig {
    constructor() {
        // Set this to false for live environment
        this.isProduction = true;
        
        // PayPal Client IDs
        this.clientIds = {
            sandbox: 'AbQn-fDDUqd-D7sEm2zY8Q6XwdcI5JqEvq1bWhPjpp_s_8SIR8WBZXez36Z5FR0TDGhbqk3VaQA0BuNU', // Your sandbox client ID
            production: 'AYtNdEqhVK8Umiz0_xB51Lyd_yMnLLBd0sN-Xm-pZlYtQmkFkMAhwYlb4EeBbqsNS1m23qQt3le5mTiI' 
        };
        
        // PayPal SDK URL configuration
        this.sdkOptions = {
            currency: 'USD',
            intent: 'capture',
            // Add other components if needed: 'buttons,messages,funding-eligibility'
            components: 'buttons'
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
            'components': this.sdkOptions.components
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
            label: 'pay',
            height: 40
        };
    }
}

// Export a singleton instance
export const paypalConfig = new PayPalConfig();

// Also export the class for advanced usage
export { PayPalConfig }; 