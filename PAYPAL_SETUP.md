# PayPal Setup Guide

## Quick Setup Instructions

### 1. Get Your PayPal Credentials

#### For Sandbox (Testing):
1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Log in with your PayPal account
3. Click "Create App" 
4. Choose "Default Application" and select "Sandbox"
5. Copy your **Sandbox Client ID**

#### For Live (Production):
1. In PayPal Developer Dashboard, create another app
2. Choose "Live" environment 
3. Copy your **Live Client ID**

### 2. Configure Your Credentials

Open `js/paypal-config.js` and replace the placeholder values:

```javascript
// PayPal Client IDs
this.clientIds = {
    sandbox: 'YOUR_ACTUAL_SANDBOX_CLIENT_ID',     // Replace this
    production: 'YOUR_ACTUAL_PRODUCTION_CLIENT_ID' // Replace this
};
```

### 3. Set Environment Mode

In `js/paypal-config.js`, set the environment:

```javascript
// Set this to false for sandbox/testing, true for live payments
this.isProduction = false; // Change to true when ready for live payments
```

## Environment Switching

### Testing Mode (Sandbox)
- Set `isProduction = false`
- Use sandbox PayPal accounts for testing
- Payments are simulated (no real money)
- PayPal provides test accounts in the developer dashboard

### Live Mode (Production)  
- Set `isProduction = true`
- Real payments will be processed
- Make sure you have proper business verification with PayPal

## Security Notes

⚠️ **Important**: 
- Never commit real PayPal credentials to version control
- Consider using environment variables for production
- The client ID is safe to expose (it's meant to be public)
- Never expose your client secret in frontend code

## Testing

1. Set up sandbox mode first
2. Create test buyer accounts in PayPal Developer Dashboard  
3. Test the complete purchase flow
4. Verify orders appear in your PayPal Sandbox dashboard
5. Only switch to production when everything works perfectly

## Backend Integration

The shop sends purchase data to your Cloudflare Workers backend at:
```
POST https://still-wood-forum-v2.jaidenschembri1.workers.dev/api/purchases
```

Make sure your backend can handle the purchase data structure:
```json
{
  "orderId": "paypal_order_id",
  "productId": "product_identifier", 
  "size": "selected_size",
  "amount": 24.99,
  "status": "COMPLETED",
  "environment": "sandbox|production",
  "paypalData": {
    "payerId": "payer_id",
    "payerEmail": "payer@email.com",
    "captureId": "capture_id",
    "createTime": "timestamp",
    "updateTime": "timestamp"
  }
}
```

## Troubleshooting

### Common Issues:
1. **"Payment system is not configured"** - Check your client IDs in paypal-config.js
2. **"Payment system not available"** - Check browser console for SDK loading errors
3. **"Unable to load payment options"** - Verify your client ID is valid for the current environment

### Debug Mode:
The system logs detailed information to the browser console. Check console for:
- PayPal SDK loading status
- Environment mode confirmation  
- Order creation and capture details
- Backend communication results 