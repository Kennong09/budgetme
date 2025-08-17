# BudgetSense Chatbot Setup Guide

## Quick Setup

The BudgetMe application now includes BudgetSense, an AI-powered financial assistant chatbot. Follow these steps to enable it:

### 1. Get OpenRouter API Key

1. Visit [OpenRouter.ai](https://openrouter.ai)
2. Create an account or sign in
3. Navigate to your API Keys section
4. Generate a new API key

### 2. Set Environment Variable

Add your API key to your environment variables:

```bash
# In your .env file (create if it doesn't exist)
REACT_APP_OPENROUTER_API_KEY=your_api_key_here
```

### 3. Restart Development Server

```bash
npm start
```

### 4. Test the Chatbot

1. Log in to your BudgetMe account
2. Look for the "Chat with BudgetSense" button in the bottom-right corner
3. Click it to start chatting with your AI financial assistant!

## Features

- **Smart Financial Advice**: Get personalized budgeting tips and financial guidance
- **App Integration**: The chatbot understands BudgetMe features and can help you navigate
- **Real-time Chat**: Instant responses with conversation history
- **Mobile Friendly**: Works seamlessly on desktop and mobile devices

## Usage Tips

- Ask about budgeting strategies
- Get help with BudgetMe features
- Request financial tips and advice
- Ask for help analyzing your spending patterns
- Get guidance on setting financial goals

## Cost Information

The chatbot uses the `openai/gpt-oss-20b:free` model from OpenRouter, which is free to use with reasonable rate limits. No additional costs beyond the OpenRouter account.

## Troubleshooting

**Chatbot not showing?**
- Make sure you're logged in to a BudgetMe account
- Check that your API key is correctly set in the .env file
- Restart your development server after adding the environment variable

**Getting API errors?**
- Verify your OpenRouter API key is valid
- Check your internet connection
- Ensure you haven't exceeded your rate limits

## Support

For issues or questions about the chatbot feature, refer to the detailed documentation in `src/components/chatbot/README.md`.
