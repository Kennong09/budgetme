# AI Prediction Integration with Facebook Prophet Model

## Overview

This design document outlines the integration of Facebook Prophet machine learning model into the BudgetMe application to provide authenticated users with personalized financial predictions and AI-powered insights. The integration focuses on user-specific transaction data, implements a usage limit system, and provides real-time predictions through a FastAPI backend service.

## Technology Stack & Dependencies

### Frontend Integration
- **React Components**: Enhanced `AIPrediction.tsx` component with real-time data integration
- **State Management**: React hooks for prediction data management and usage tracking
- **Visualization**: Highcharts and Recharts for Prophet forecast visualization
- **API Communication**: Axios/Fetch for FastAPI backend communication

### Backend Architecture
- **FastAPI**: Python web framework for prediction API endpoints
- **Facebook Prophet**: Time series forecasting model for financial predictions
- **Database Integration**: Supabase PostgreSQL with Prisma ORM for data persistence
- **AI Insights**: OpenRouter API integration with GPT-OSS-20B for contextual insights

### Required Dependencies

#### Python Backend (requirements.txt)
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
prophet==1.1.5
pandas==2.1.3
numpy==1.24.4
pydantic==2.5.0
python-multipart==0.0.6
httpx==0.25.2
python-dotenv==1.0.0
supabase==2.0.3
asyncpg==0.29.0
```

#### Frontend Dependencies (package.json additions)
```json
{
  "axios": "^1.6.0",
  "recharts": "^2.8.0"
}
```

## Architecture Overview

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[AIPrediction.tsx]
        B[Transaction Data]
        C[Usage Tracking]
        D[Visualization Components]
    end
    
    subgraph "FastAPI Backend"
        E[Prediction API]
        F[Prophet Model]
        G[Data Processing]
        H[Usage Validation]
    end
    
    subgraph "Data Layer"
        I[Supabase DB]
        J[Transaction Records]
        K[Prediction Cache]
        L[Usage Tracking]
    end
    
    subgraph "AI Services"
        M[OpenRouter API]
        N[GPT-OSS-20B]
        O[Insight Generation]
    end
    
    A --> E
    B --> G
    E --> F
    F --> G
    G --> K
    H --> L
    E --> M
    M --> N
    N --> O
    O --> A
    
    I <--> J
    I <--> K
    I <--> L
    
    style A fill:#4e73df
    style F fill:#f6c23e
    style I fill:#36b9cc
    style M fill:#1cc88a
```

## Component Architecture

### Enhanced AIPrediction Component

```mermaid
classDiagram
    class AIPrediction {
        +usageCount: number
        +maxUsage: number
        +predictionData: ProphetPrediction[]
        +insights: AIInsightResponse
        +loading: boolean
        +generatePredictions(): void
        +fetchTransactionData(): Transaction[]
        +validateUsageLimit(): boolean
        +displayResults(): void
    }
    
    class ProphetService {
        +generateForecast(data): ProphetPrediction[]
        +preprocessData(transactions): TimeSeriesData
        +validatePredictions(forecast): boolean
    }
    
    class UsageTracker {
        +currentUsage: number
        +resetDate: Date
        +incrementUsage(): void
        +checkLimit(): boolean
        +resetUsage(): void
    }
    
    class PredictionVisualization {
        +chartData: ChartData
        +confidenceIntervals: boolean
        +renderProphetChart(): JSX.Element
        +renderCategoryBreakdown(): JSX.Element
    }
    
    AIPrediction --> ProphetService
    AIPrediction --> UsageTracker
    AIPrediction --> PredictionVisualization
```

## Data Flow Architecture

### User Authentication & Data Security

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Auth
    participant FastAPI
    participant Prophet
    participant Supabase
    participant OpenRouter
    
    User->>Frontend: Click "Generate Predictions"
    Frontend->>Auth: Validate User Session
    Auth-->>Frontend: User ID & Token
    Frontend->>FastAPI: POST /predict (user_id, auth_token)
    FastAPI->>Supabase: Validate User & Check Usage
    Supabase-->>FastAPI: Usage Count & Transaction Data
    
    alt Usage Limit Not Exceeded
        FastAPI->>Prophet: Generate Forecast
        Prophet-->>FastAPI: Prediction Results
        FastAPI->>OpenRouter: Generate Insights
        OpenRouter-->>FastAPI: AI Insights
        FastAPI->>Supabase: Store Results & Update Usage
        FastAPI-->>Frontend: Prediction Response
        Frontend-->>User: Display Results
    else Usage Limit Exceeded
        FastAPI-->>Frontend: Usage Limit Error
        Frontend-->>User: Show Limit Message
    end
```

## API Endpoint Design

### FastAPI Prediction Service

#### 1. Generate Predictions Endpoint
```python
@app.post("/api/v1/predictions/generate")
async def generate_predictions(
    request: PredictionRequest,
    user_id: str = Depends(get_authenticated_user)
):
    """
    Generate financial predictions using Prophet model
    - Validates user authentication
    - Checks usage limits (5/5 per period)
    - Processes transaction data
    - Returns Prophet forecasts and AI insights
    """
```

#### 2. Usage Tracking Endpoint
```python
@app.get("/api/v1/predictions/usage")
async def get_prediction_usage(
    user_id: str = Depends(get_authenticated_user)
):
    """
    Get current usage count for authenticated user
    - Returns current usage count
    - Returns reset date
    - Returns remaining predictions
    """
```

#### 3. Historical Predictions Endpoint
```python
@app.get("/api/v1/predictions/history")
async def get_prediction_history(
    user_id: str = Depends(get_authenticated_user)
):
    """
    Retrieve cached prediction results
    - Returns previous predictions
    - Includes confidence metrics
    - Provides trend analysis
    """
```

## Database Schema Extensions

### Prediction Usage Tracking Table
```sql
CREATE TABLE prediction_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    usage_count INTEGER DEFAULT 0,
    max_usage INTEGER DEFAULT 5,
    reset_date TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 month',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE prediction_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own prediction usage" ON prediction_usage
    FOR ALL USING (auth.uid() = user_id);
```

### Prediction Results Cache Table
```sql
CREATE TABLE prediction_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    prediction_data JSONB NOT NULL,
    ai_insights JSONB,
    timeframe VARCHAR(20) NOT NULL,
    confidence_score DECIMAL(3,2),
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

-- Row Level Security
ALTER TABLE prediction_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own predictions" ON prediction_results
    FOR SELECT USING (auth.uid() = user_id);
```

## Prophet Model Implementation

### Data Preprocessing Pipeline

```mermaid
flowchart LR
    A[Raw Transactions] --> B[Date Validation]
    B --> C[Amount Aggregation]
    C --> D[Missing Data Handling]
    D --> E[Outlier Detection]
    E --> F[Prophet Format]
    F --> G[Model Training]
    G --> H[Forecast Generation]
    H --> I[Confidence Intervals]
    I --> J[Result Validation]
```

### Prophet Configuration

#### Model Parameters
- **Seasonality Mode**: Additive for stable patterns, Multiplicative for growing trends
- **Yearly Seasonality**: Enabled for annual spending patterns
- **Weekly Seasonality**: Disabled for monthly aggregated data
- **Daily Seasonality**: Disabled for monthly financial data
- **Holidays**: Optional integration for country-specific holidays

#### Forecast Horizon
- **3 Months**: 90-day forecast with daily granularity
- **6 Months**: 180-day forecast with weekly granularity  
- **12 Months**: 365-day forecast with monthly granularity

## Enhanced Frontend Component Structure

### Main AIPrediction Component Integration

```typescript
interface AIPredictionProps {
  userId: string;
  transactionData: Transaction[];
}

interface PredictionState {
  loading: boolean;
  usageCount: number;
  maxUsage: number;
  predictions: ProphetPrediction[];
  insights: AIInsightResponse;
  error: string | null;
}

const AIPrediction: React.FC<AIPredictionProps> = ({ userId, transactionData }) => {
  const [state, setState] = useState<PredictionState>({
    loading: false,
    usageCount: 0,
    maxUsage: 5,
    predictions: [],
    insights: null,
    error: null
  });

  const generatePredictions = async () => {
    if (state.usageCount >= state.maxUsage) {
      setState(prev => ({ 
        ...prev, 
        error: 'Usage limit reached. Please wait for reset.' 
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await fetch('/api/v1/predictions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          user_id: userId,
          transaction_data: transactionData,
          timeframe: 'months_3'
        })
      });

      const result = await response.json();
      
      setState(prev => ({
        ...prev,
        predictions: result.predictions,
        insights: result.insights,
        usageCount: result.usage_count,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to generate predictions',
        loading: false
      }));
    }
  };
};
```

### Visualization Components Integration

#### Prophet Forecast Chart
```typescript
const ProphetForecastChart: React.FC<{
  predictions: ProphetPrediction[];
  historical: Transaction[];
}> = ({ predictions, historical }) => {
  const chartData = useMemo(() => {
    return predictions.map(pred => ({
      date: pred.date,
      actual: pred.actual,
      predicted: pred.predicted,
      upper: pred.upper,
      lower: pred.lower,
      confidence: pred.confidence
    }));
  }, [predictions]);

  return (
    <div className="card">
      <div className="card-header">
        <h6 className="font-weight-bold text-primary">
          Prophet Financial Forecast
        </h6>
      </div>
      <div className="card-body">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="predicted" 
              stroke="#4e73df" 
              strokeWidth={2}
            />
            <Area
              dataKey="upper"
              stroke="#1cc88a"
              fill="#1cc88a"
              fillOpacity={0.2}
            />
            <Area
              dataKey="lower"
              stroke="#e74a3b"
              fill="#e74a3b"
              fillOpacity={0.2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
```

## Integration with Existing Services

### Enhanced PredictionService Integration

```typescript
// Enhanced predictionService.ts
export class PredictionService {
  static async generateProphetPredictions(
    userId: string,
    timeframe: string = 'months_3'
  ): Promise<ProphetPredictionResponse> {
    try {
      // Check usage limits first
      const usage = await this.checkUsageLimit(userId);
      if (usage.exceeded) {
        throw new Error('Usage limit exceeded');
      }

      // Fetch user's transaction data
      const transactions = await TransactionService.getUserTransactions(userId, {
        startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year back
        endDate: new Date()
      });

      // Call FastAPI prediction endpoint
      const response = await fetch(`${FASTAPI_BASE_URL}/api/v1/predictions/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({
          user_id: userId,
          transaction_data: transactions,
          timeframe
        })
      });

      if (!response.ok) {
        throw new Error('Prediction generation failed');
      }

      const result = await response.json();
      
      // Cache results
      await this.cachePredictionResults(userId, result);
      
      return result;
    } catch (error) {
      console.error('Prophet prediction error:', error);
      throw error;
    }
  }

  static async checkUsageLimit(userId: string): Promise<UsageStatus> {
    const { data, error } = await supabase
      .from('prediction_usage')
      .select('usage_count, max_usage, reset_date')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Create new usage record
      await supabase
        .from('prediction_usage')
        .insert({ user_id: userId });
      
      return { exceeded: false, current: 0, max: 5, resetDate: new Date() };
    }

    const now = new Date();
    const resetDate = new Date(data.reset_date);
    
    if (now > resetDate) {
      // Reset usage count
      await supabase
        .from('prediction_usage')
        .update({ 
          usage_count: 0, 
          reset_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) 
        })
        .eq('user_id', userId);
      
      return { exceeded: false, current: 0, max: data.max_usage, resetDate };
    }

    return {
      exceeded: data.usage_count >= data.max_usage,
      current: data.usage_count,
      max: data.max_usage,
      resetDate
    };
  }
}
```

### AI Insights Service Enhancement

```typescript
// Enhanced aiInsightsService.ts
export class AIInsightsService {
  static async generateProphetInsights(
    predictions: ProphetPrediction[],
    userContext: UserFinancialProfile
  ): Promise<AIInsightResponse> {
    try {
      const prompt = this.buildProphetAnalysisPrompt(predictions, userContext);
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b:free',
          messages: [
            {
              role: 'system',
              content: 'You are a financial advisor AI specializing in Prophet model interpretation and financial forecasting.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1500,
          temperature: 0.7
        })
      });

      const result = await response.json();
      
      return this.parseProphetInsights(result.choices[0].message.content);
    } catch (error) {
      console.error('AI insights generation failed:', error);
      return this.generateFallbackInsights(predictions, userContext);
    }
  }

  private static buildProphetAnalysisPrompt(
    predictions: ProphetPrediction[],
    userContext: UserFinancialProfile
  ): string {
    return `
    Analyze the following Facebook Prophet financial forecasting results for personalized insights:

    USER PROFILE:
    - Monthly Income: $${userContext.avgMonthlyIncome.toFixed(2)}
    - Monthly Expenses: $${userContext.avgMonthlyExpenses.toFixed(2)}
    - Savings Rate: ${userContext.savingsRate.toFixed(1)}%

    PROPHET PREDICTIONS (Next 3 Months):
    ${predictions.slice(0, 3).map(p => 
      `${p.date.toLocaleDateString()}: $${p.predicted.toFixed(2)} 
       (Range: $${p.lower.toFixed(2)} - $${p.upper.toFixed(2)}, 
       Confidence: ${(p.confidence * 100).toFixed(0)}%)`
    ).join('\n')}

    TREND ANALYSIS:
    - Trend Component: ${predictions[0]?.trend.toFixed(2)}
    - Seasonal Component: ${predictions[0]?.seasonal.toFixed(2)}

    Provide:
    1. Key insights about the predicted financial trajectory
    2. Risk assessment based on confidence intervals
    3. Actionable recommendations for financial optimization
    4. Seasonal pattern interpretation
    5. Budget adjustment suggestions

    Keep response concise, actionable, and focused on the Prophet model's specific insights.
    `;
  }
}
```

## Usage Limit Implementation

### Frontend Usage Display Component

```typescript
const UsageLimitDisplay: React.FC<{
  current: number;
  max: number;
  resetDate: Date;
}> = ({ current, max, resetDate }) => {
  const remaining = max - current;
  const percentage = (current / max) * 100;
  
  return (
    <div className="card mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="font-weight-bold text-primary">
            AI Prediction Usage
          </h6>
          <span className="badge badge-info">
            {remaining} remaining
          </span>
        </div>
        
        <div className="progress mb-2" style={{ height: '8px' }}>
          <div 
            className={`progress-bar ${
              percentage > 80 ? 'bg-danger' : 
              percentage > 60 ? 'bg-warning' : 'bg-success'
            }`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        
        <div className="d-flex justify-content-between text-sm">
          <span className="text-muted">{current} of {max} used</span>
          <span className="text-muted">
            Resets {resetDate.toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
};
```

## Testing Strategy

### Prophet Model Testing

```python
# test_prophet_predictions.py
import pytest
from unittest.mock import Mock
import pandas as pd
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_prophet_prediction_generation():
    """Test Prophet model prediction generation"""
    # Mock transaction data
    test_data = {
        "user_id": "test-user-123",
        "transaction_data": [
            {"date": "2024-01-01", "amount": 1000, "type": "income"},
            {"date": "2024-01-15", "amount": 500, "type": "expense"},
            {"date": "2024-02-01", "amount": 1000, "type": "income"},
            {"date": "2024-02-15", "amount": 600, "type": "expense"}
        ],
        "timeframe": "months_3"
    }
    
    response = client.post(
        "/api/v1/predictions/generate",
        json=test_data,
        headers={"Authorization": "Bearer test-token"}
    )
    
    assert response.status_code == 200
    result = response.json()
    
    assert "predictions" in result
    assert "insights" in result
    assert "usage_count" in result
    assert len(result["predictions"]) > 0

def test_usage_limit_enforcement():
    """Test usage limit enforcement"""
    # Simulate 5 previous uses
    for i in range(5):
        response = client.post(
            "/api/v1/predictions/generate",
            json=test_data,
            headers={"Authorization": "Bearer test-token"}
        )
    
    # 6th request should fail
    response = client.post(
        "/api/v1/predictions/generate",
        json=test_data,
        headers={"Authorization": "Bearer test-token"}
    )
    
    assert response.status_code == 429
    assert "usage limit" in response.json()["detail"].lower()
```

### Frontend Component Testing

```typescript
// AIPrediction.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AIPrediction } from './AIPrediction';
import { AuthContext } from '../../utils/AuthContext';

const mockUser = { id: 'test-user', email: 'test@example.com' };
const mockTransactions = [
  { id: '1', amount: 1000, type: 'income', date: new Date() },
  { id: '2', amount: 500, type: 'expense', date: new Date() }
];

describe('AIPrediction Component', () => {
  test('renders usage limit display', () => {
    render(
      <AuthContext.Provider value={{ user: mockUser }}>
        <AIPrediction />
      </AuthContext.Provider>
    );
    
    expect(screen.getByText(/AI Prediction Usage/i)).toBeInTheDocument();
    expect(screen.getByText(/remaining/i)).toBeInTheDocument();
  });

  test('generates predictions when button clicked', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        predictions: [],
        insights: {},
        usage_count: 1
      })
    });
    
    global.fetch = mockFetch;
    
    render(
      <AuthContext.Provider value={{ user: mockUser }}>
        <AIPrediction />
      </AuthContext.Provider>
    );
    
    const generateButton = screen.getByText(/Generate Predictions/i);
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/predictions/generate',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });
  });

  test('displays error when usage limit exceeded', async () => {
    const mockFetch = jest.fn().mockRejectedValue(
      new Error('Usage limit exceeded')
    );
    
    global.fetch = mockFetch;
    
    render(
      <AuthContext.Provider value={{ user: mockUser }}>
        <AIPrediction />
      </AuthContext.Provider>
    );
    
    const generateButton = screen.getByText(/Generate Predictions/i);
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Usage limit/i)).toBeInTheDocument();
    });
  });
});
```

## Environment Configuration

### FastAPI Environment Variables
```env
# .env file for FastAPI service
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
OPENROUTER_API_KEY=your_openrouter_key
DATABASE_URL=postgresql://user:pass@localhost/budgetme
PROPHET_MODEL_PATH=./models/prophet_model.joblib
CACHE_TTL=3600
MAX_PREDICTIONS_PER_USER=5
PREDICTION_RESET_INTERVAL=2592000  # 30 days
```

### Frontend Environment Variables
```env
# Additional variables for React app
REACT_APP_FASTAPI_URL=http://localhost:8000
REACT_APP_OPENROUTER_API_KEY=your_openrouter_key
REACT_APP_PREDICTION_CACHE_TTL=300000  # 5 minutes
```

## Performance Optimization

### Caching Strategy

```mermaid
flowchart TD
    A[User Request] --> B{Cache Check}
    B -->|Hit| C[Return Cached Data]
    B -->|Miss| D[Generate Prediction]
    D --> E[Store in Cache]
    E --> F[Return Fresh Data]
    C --> G[Update Usage Count]
    F --> G
    G --> H[Response to User]
    
    I[Background Process] --> J[Cache Cleanup]
    J --> K[Remove Expired]
    K --> L[Update Statistics]
```

### Database Optimization

1. **Indexing Strategy**
   - Index on `user_id` for prediction_usage table
   - Composite index on `user_id, generated_at` for prediction_results
   - Partial index for active predictions only

2. **Data Retention Policy**
   - Automatic cleanup of expired predictions
   - Archive old usage records after 1 year
   - Compress historical prediction data

3. **Query Optimization**
   - Use connection pooling for FastAPI
   - Implement read replicas for prediction queries
   - Batch process multiple predictions when possible

## Security Considerations

### Authentication & Authorization
- JWT token validation for all prediction endpoints
- Row-level security in Supabase for user data isolation
- Rate limiting per user to prevent abuse
- API key rotation for OpenRouter integration

### Data Privacy
- Encrypt prediction results in database
- Anonymize transaction data for model training
- Implement data retention policies
- Secure API communication with HTTPS

### Usage Control
- Enforce strict 5-prediction limit per user per month
- Track and log all prediction generation attempts
- Implement cooldown periods for failed attempts
- Monitor for unusual usage patterns