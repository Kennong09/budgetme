# AI Insights Feature - Quick Setup Guide

## 🚀 Quick Start

### 1. Environment Setup

**Frontend (.env)**
```env
# Prophet API Configuration
REACT_APP_PROPHET_API_URL=http://localhost:8000

# OpenRouter API Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=openai/gpt-oss-20b:free
```

**Backend (prediction_api/.env)**
```env
# OpenRouter API for AI Insights
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=openai/gpt-oss-20b:free
```

### 2. Get OpenRouter API Key

1. Visit [OpenRouter.ai](https://openrouter.ai/)
2. Create an account
3. Navigate to API Keys section
4. Generate a new API key
5. Copy the key to your environment files

### 3. Usage in Components

**In AIPrediction.tsx (Already implemented)**
```tsx
<AIInsightsCard
  insights={currentInsights}
  timeframe={timeframe}
  modelAccuracy={currentModelAccuracy}
  activeTip={activeTip}
  tooltipPosition={tooltipPosition}
  onToggleTip={toggleTip}
  // Enhanced props for AI integration
  predictionData={currentPredictions?.predictions || []}
  categoryForecasts={Object.values(currentPredictions?.category_forecasts || {})}
  userProfile={userProfileData}
/>
```

### 4. Features Available

✅ **Interactive Generate Button** - Click to generate AI insights  
✅ **Usage Limits** - 5 generations per user per day  
✅ **Real-time Status** - Shows remaining uses (e.g., 3/5)  
✅ **OpenRouter Integration** - Uses openai/gpt-oss-20b:free model  
✅ **Personalized Advice** - Tailored financial recommendations  
✅ **Risk Assessment** - Identify financial risks and mitigation  
✅ **Opportunity Areas** - Find areas for financial improvement  
✅ **Expandable Details** - Show/hide detailed analysis  

### 5. API Endpoints

**Generate AI Insights**
```
POST /api/v1/predictions/ai-insights
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  \"predictions\": [...],
  \"category_forecasts\": {...},
  \"user_profile\": {...},
  \"timeframe\": \"months_3\",
  \"custom_prompt\": \"Optional custom analysis focus\"
}
```

### 6. Testing the Feature

**Option 1: Use Demo Component**
```tsx
import AIInsightsDemo from './components/predictions/AIInsightsDemo';

// Add to your route or component
<AIInsightsDemo />
```

**Option 2: Navigate to Predictions Page**
1. Go to `/predictions` route
2. Ensure you have transaction data
3. Click \"Generate AI Insights\" button
4. View personalized recommendations

### 7. Troubleshooting

**Issue: \"AI insights service not available\"**
- Check OpenRouter API key is correctly set
- Verify backend server is running on port 8000
- Check network connectivity

**Issue: \"Usage limit exceeded\"**
- Wait until midnight for daily reset
- Usage is tracked per user via localStorage

**Issue: \"No transaction data\"**
- Add at least 7 transactions in the app
- Ensure transactions have valid dates and amounts

### 8. Model Configuration

**Current Model:** `openai/gpt-oss-20b:free`
- **Cost:** Free tier
- **Rate Limits:** Generous for development
- **Quality:** Good for financial analysis
- **Response Time:** 2-5 seconds typically

**Alternative Models (if needed):**
- `openai/gpt-oss-20b:free` - Faster, paid
- `anthropic/claude-instant-v1` - Different AI provider
- `meta-llama/llama-2-70b-chat` - Open source option

### 9. Customization

**Custom Prompts:**
```tsx
const customPrompt = `
  Focus on retirement planning advice for someone in their 30s.
  Include specific investment recommendations and tax strategies.
`;

// Pass to the request
{ ...request, customPrompt }
```

**Usage Limits (can be modified):**
```tsx
// In AIInsightsCard.tsx
const MAX_DAILY_USAGE = 5; // Change this value
```

### 10. Production Considerations

- **Rate Limiting:** Implement server-side rate limiting
- **Usage Tracking:** Move from localStorage to database
- **Error Handling:** Add comprehensive error boundaries
- **Monitoring:** Add logging and analytics
- **Caching:** Implement Redis-based caching
- **Security:** Validate all inputs and sanitize outputs

---

## 🎯 Key Files Modified

1. `src/components/predictions/components/AIInsightsCard.tsx` - Main UI component
2. `src/services/database/aiInsightsService.ts` - API integration service
3. `prediction_api/routes/predictions.py` - Backend API endpoint
4. `prediction_api/services/ai_insights_service.py` - AI processing service
5. Environment files - API configuration

## 📱 User Experience

1. User navigates to Predictions page
2. Sees \"Generate AI Insights\" button with usage counter (e.g., 2/5)
3. Clicks button → Loading state shows
4. AI generates personalized insights (2-5 seconds)
5. User sees comprehensive analysis with recommendations
6. Can expand details for risk assessment and opportunities
7. Usage counter updates (e.g., 3/5)

That's it! The AI insights feature is now fully integrated and ready to use. 🎉