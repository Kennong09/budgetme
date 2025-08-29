# AI-Generated Insights Feature

## Overview

The AI-Generated Insights feature provides personalized financial advice and recommendations using OpenRouter API with OpenAI's GPT model. This interactive feature helps users understand their financial patterns and get actionable advice for improving their financial health.

## Features

### 🤖 AI-Powered Analysis
- **Personalized Recommendations**: Get specific advice based on your spending patterns
- **Risk Assessment**: Identify potential financial risks and mitigation strategies
- **Opportunity Areas**: Discover areas for financial improvement and optimization
- **Investment Guidance**: Receive tailored investment and savings recommendations

### 🎯 Interactive UI
- **Generate Button**: Click to generate new insights on-demand
- **Usage Limits**: 5/5 daily limit per user with automatic reset
- **Loading States**: Clear feedback during AI processing
- **Detailed View**: Expandable detailed analysis with confidence scores

### 🔒 Usage Management
- **Daily Limits**: 5 AI insight generations per user per day
- **Local Storage Tracking**: Client-side usage tracking with automatic reset
- **Usage Status Display**: Real-time counter showing remaining uses
- **Error Handling**: Graceful fallbacks when limits are exceeded

## Technical Implementation

### Frontend Components

#### AIInsightsCard.tsx
Enhanced with interactive AI insights functionality:
- Generate button with usage limit checking
- Real-time usage status display
- Expandable detailed insights view
- Risk assessment and opportunity identification
- Confidence level indicators

### Backend API

#### New Endpoint: `/api/v1/predictions/ai-insights`
- **Method**: POST
- **Authentication**: Bearer token required
- **Rate Limiting**: 5 requests per user per day
- **Model**: OpenAI GPT-OSS-20B:free via OpenRouter API

### API Integration

#### OpenRouter Configuration
```env
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_MODEL=openai/gpt-oss-20b:free
```

#### Request Format
```json
{
  "predictions": [...],
  "category_forecasts": {...},
  "user_profile": {...},
  "timeframe": "months_3",
  "custom_prompt": "Optional custom analysis focus"
}
```

#### Response Format
```json
{
  "success": true,
  "insights": [
    {
      "title": "Budget Optimization",
      "description": "Analysis of spending patterns...",
      "category": "savings",
      "confidence": 0.85,
      "recommendation": "Specific actionable advice..."
    }
  ],
  "metadata": {
    "generated_at": "2024-01-15T10:30:00Z",
    "model_used": "openai/gpt-oss-20b:free",
    "execution_time_ms": 2500
  },
  "usage": {
    "current_usage": 1,
    "max_usage": 5,
    "reset_date": "2024-01-16T00:00:00Z"
  }
}
```

## User Experience

### Getting Started
1. Navigate to the Predictions page
2. Ensure you have transaction data (minimum 7 transactions)
3. Click the "Generate AI Insights" button
4. Wait for AI analysis (typically 2-5 seconds)
5. Review personalized recommendations

### Insight Categories
- **Trend Analysis**: Income and expense trajectory insights
- **Category Spending**: Specific category optimization advice
- **Risk Assessment**: Financial risk identification and mitigation
- **Opportunity Areas**: Areas for financial improvement
- **Goal Setting**: Personalized financial goal recommendations

### Usage Limits
- **Daily Limit**: 5 AI insight generations per user
- **Reset Time**: Automatic reset at midnight (local time)
- **Tracking**: Client-side localStorage tracking
- **Feedback**: Clear messaging when limits are reached

## Error Handling

### Graceful Degradation
- API failures fall back to basic insights
- Network issues show helpful error messages
- Usage limit exceeded shows clear feedback
- Loading states prevent user confusion

### Fallback Mechanisms
1. **Primary**: OpenRouter API with GPT model
2. **Fallback 1**: Prophet API existing insights
3. **Fallback 2**: Chatbot service integration
4. **Fallback 3**: Pre-generated basic insights

## Security & Privacy

### Data Protection
- User authentication required for all requests
- Transaction data encrypted in transit
- No personal data stored in AI service logs
- GDPR compliant data handling

### API Security
- Bearer token authentication
- Rate limiting per user
- Request validation and sanitization
- Secure environment variable management

## Development Setup

### Environment Variables
```env
# Frontend (.env)
REACT_APP_PROPHET_API_URL=http://localhost:8000
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openai/gpt-oss-20b:free

# Backend (prediction_api/.env)
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openai/gpt-oss-20b:free
```

### API Key Setup
1. Visit [OpenRouter.ai](https://openrouter.ai/)
2. Create an account and generate an API key
3. Add the key to your environment variables
4. Test the connection with the health check endpoint

### Local Development
```bash
# Start frontend
npm start

# Start backend (in prediction_api directory)
python main.py
```

## Monitoring & Analytics

### Usage Analytics
- Track daily insight generation count
- Monitor API response times
- Log error rates and types
- User engagement metrics

### Performance Metrics
- Average response time: ~2-5 seconds
- Success rate target: >95%
- User satisfaction tracking
- API cost monitoring

## Future Enhancements

### Planned Features
- **Custom Prompts**: User-defined analysis focus
- **Insight History**: Save and review past insights
- **Comparative Analysis**: Month-over-month insight trends
- **Export Functionality**: PDF/email insight reports
- **Advanced Models**: Integration with GPT-4 and Claude

### Performance Improvements
- **Caching**: Redis-based insight caching
- **Background Processing**: Async insight generation
- **Batch Processing**: Multiple user insight generation
- **CDN Integration**: Faster response times globally

## Support & Troubleshooting

### Common Issues
1. **Usage Limit Reached**: Wait until midnight for reset
2. **API Key Invalid**: Check OpenRouter API key configuration
3. **No Transaction Data**: Add minimum 7 transactions
4. **Slow Response**: Check network connection and API status

### Contact Support
- Technical issues: Create GitHub issue
- Feature requests: Use project discussions
- API problems: Check OpenRouter status page

---

*This feature enhances the BudgetMe experience by providing personalized, AI-driven financial guidance to help users make better financial decisions.*