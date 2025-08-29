# BudgetMe Prophet AI Integration

🚀 **Facebook Prophet Machine Learning Integration for Financial Forecasting**

This implementation adds advanced financial prediction capabilities to BudgetMe using Facebook Prophet, a time series forecasting model, integrated through a FastAPI backend service.

## 🌟 Features

### 🔮 Prophet AI Predictions
- **Advanced Forecasting**: Facebook Prophet time series analysis for financial predictions
- **Confidence Intervals**: Statistical confidence bounds for prediction reliability
- **Seasonal Analysis**: Automatic detection of yearly, monthly, and custom seasonal patterns
- **Trend Analysis**: Long-term financial trend identification and projection

### 📊 Enhanced Visualizations
- **Interactive Charts**: Recharts-based Prophet forecast visualization with confidence intervals
- **Category Forecasting**: Per-category spending predictions with trend analysis
- **Real-time Updates**: Live chart updates with prediction confidence scores
- **Multiple View Types**: Bar charts, line charts, and pie charts for different data perspectives

### 🔒 Usage Management
- **Rate Limiting**: 5 predictions per user per month with automatic reset
- **Usage Tracking**: Real-time usage monitoring with visual indicators
- **Caching System**: 24-hour prediction result caching for performance optimization
- **Authentication**: Secure Supabase JWT token validation

### 🤖 AI Insights
- **OpenRouter Integration**: GPT-powered financial analysis and recommendations
- **Contextual Insights**: Prophet model interpretation with actionable advice
- **Risk Assessment**: Automated financial risk analysis based on predictions
- **Trend Interpretation**: Plain-language explanation of forecast trends

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │────│  FastAPI Backend │────│  Prophet Model  │
│                 │    │                 │    │                 │
│ • AIPrediction  │    │ • /predictions  │    │ • Time Series   │
│ • Visualizations│    │ • /usage        │    │ • Forecasting   │
│ • Usage Tracking│    │ • /admin        │    │ • Seasonality   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Supabase Auth   │    │ Usage Tracking  │    │ OpenRouter API  │
│                 │    │                 │    │                 │
│ • JWT Tokens    │    │ • Rate Limiting │    │ • AI Insights   │
│ • User Sessions │    │ • Result Cache  │    │ • GPT Analysis  │
│ • RLS Security  │    │ • Statistics    │    │ • Recommendations│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Technology Stack

### Backend
- **FastAPI**: Modern Python web framework for API endpoints
- **Facebook Prophet**: Time series forecasting library by Meta
- **Pandas & NumPy**: Data processing and numerical computations
- **Supabase**: Database and authentication integration
- **OpenRouter**: AI insights powered by GPT models

### Frontend
- **React**: Enhanced prediction components with hooks
- **TypeScript**: Type-safe Prophet data models and interfaces
- **Recharts**: Interactive Prophet forecast visualizations
- **Axios**: HTTP client for FastAPI communication
- **React Context**: State management for prediction data

### Infrastructure
- **Docker**: Containerized development and deployment
- **Nginx**: Production web server with API proxy
- **PostgreSQL**: Database with prediction tables and RLS

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Python 3.8+
- Git (recommended)

### Automated Setup

#### Linux/macOS
```bash
# Clone the repository
git clone <repository-url>
cd budgetme

# Run automated setup
chmod +x setup.sh
./setup.sh
```

#### Windows
```powershell
# Clone the repository
git clone <repository-url>
cd budgetme

# Run automated setup
.\\setup.ps1
```

### Manual Setup

1. **Install Frontend Dependencies**
   ```bash
   npm install
   ```

2. **Setup Python Environment**
   ```bash
   cd prediction_api
   python -m venv venv
   
   # Activate virtual environment
   # Linux/macOS:
   source venv/bin/activate
   # Windows:
   venv\\Scripts\\activate
   
   # Install dependencies
   pip install -r requirements.txt
   ```

3. **Configure Environment**
   ```bash
   # Copy environment templates
   cp .env.example .env
   cp prediction_api/.env.example prediction_api/.env
   
   # Edit .env files with your API keys
   ```

4. **Setup Database**
   ```bash
   # Apply prediction tables
   npm run prisma:migrate
   
   # Or run SQL directly
   # Execute: sql/create-prediction-tables.sql
   ```

## 🏃‍♂️ Development

### Start Development Servers

```bash
# Start both frontend and backend
npm run dev:full

# Or start individually:
npm start                    # Frontend only
npm run prediction-api:start # Backend only
```

### Using Docker

```bash
# Development environment
docker-compose up -d

# Production build
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Access Points
- **Frontend**: http://localhost:3000
- **FastAPI Backend**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **API Admin Panel**: http://localhost:8000/api/v1/admin

## 🔧 Configuration

### Environment Variables

#### Frontend (.env)
```env
# Supabase Configuration
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key

# Prediction API
REACT_APP_PREDICTION_API_URL=http://localhost:8000

# AI Insights
REACT_APP_OPENROUTER_API_KEY=your_openrouter_api_key
```

#### Backend (prediction_api/.env)
```env
# Server Configuration
HOST=127.0.0.1
PORT=8000
DEBUG=True

# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# OpenRouter AI
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openai/gpt-oss-20b:free

# Prophet Configuration
PROPHET_SEASONALITY_MODE=additive
PROPHET_YEARLY_SEASONALITY=True
PROPHET_WEEKLY_SEASONALITY=False
PROPHET_DAILY_SEASONALITY=False

# Usage Limits
MAX_PREDICTIONS_PER_MONTH=5
PREDICTION_CACHE_TTL_HOURS=24
```

### Prophet Model Configuration

```python
# Prophet model parameters can be adjusted in:
# prediction_api/models/prophet_forecaster.py

model = Prophet(
    seasonality_mode='additive',     # or 'multiplicative'
    yearly_seasonality=True,         # Enable yearly patterns
    weekly_seasonality=False,        # Disable for financial data
    daily_seasonality=False,         # Disable for monthly aggregation
    changepoint_prior_scale=0.05,    # Trend flexibility
    seasonality_prior_scale=10.0,    # Seasonality strength
    interval_width=0.80,             # 80% confidence intervals
    uncertainty_samples=1000         # Uncertainty estimation
)
```

## 📊 Usage Guide

### Generating Prophet Predictions

1. **Navigate to Predictions**: Go to the AI Predictions page
2. **Check Usage**: View your current usage status (X/5 predictions)
3. **Generate**: Click \"Generate Prophet Predictions\" button
4. **View Results**: Explore forecasts, confidence intervals, and insights
5. **Analyze**: Review category-specific predictions and trends

### Understanding Prophet Results

- **Forecast Line**: Main prediction trend
- **Confidence Bands**: Upper/lower prediction bounds
- **Trend Component**: Long-term direction
- **Seasonal Component**: Recurring patterns
- **Confidence Score**: Model reliability (0-100%)

### Usage Limits

- **Free Tier**: 5 predictions per month per user
- **Reset**: Automatic monthly reset
- **Caching**: Results cached for 24 hours
- **Sharing**: Cache shared across timeframes

## 🔍 API Reference

### Prediction Endpoints

#### Generate Predictions
```http
POST /api/v1/predictions/generate
Authorization: Bearer <supabase_jwt_token>
Content-Type: application/json

{
  \"user_id\": \"uuid\",
  \"transaction_data\": [
    {
      \"date\": \"2024-01-15T00:00:00Z\",
      \"amount\": 150.00,
      \"type\": \"expense\",
      \"category\": \"groceries\"
    }
  ],
  \"timeframe\": \"months_3\",
  \"seasonality_mode\": \"additive\",
  \"include_categories\": true,
  \"include_insights\": true
}
```

#### Check Usage
```http
GET /api/v1/predictions/usage
Authorization: Bearer <supabase_jwt_token>

Response:
{
  \"user_id\": \"uuid\",
  \"current_usage\": 2,
  \"max_usage\": 5,
  \"reset_date\": \"2024-02-01T00:00:00Z\",
  \"exceeded\": false,
  \"remaining\": 3
}
```

### Admin Endpoints

#### Health Check
```http
GET /api/v1/admin/health
Authorization: Bearer <admin_token>

Response:
{
  \"status\": \"healthy\",
  \"services\": {
    \"database\": \"healthy\",
    \"usage_tracking\": \"healthy\",
    \"prophet_model\": \"healthy\"
  },
  \"usage_statistics\": {
    \"total_users\": 150,
    \"average_usage\": 2.3
  }
}
```

## 🧪 Testing

### Running Tests

```bash
# Frontend tests
npm test

# Backend tests
cd prediction_api
python -m pytest tests/

# Integration tests
npm run test:integration
```

### Test Data

Test the Prophet integration with sample data:

```bash
# Generate test predictions
curl -X POST http://localhost:8000/api/v1/admin/service/test-prediction \\n  -H \"Authorization: Bearer <admin_token>\"

# Validate prediction data
curl -X POST http://localhost:8000/api/v1/predictions/validate \\n  -H \"Authorization: Bearer <user_token>\" \\n  -H \"Content-Type: application/json\" \\n  -d @test_data.json
```

## 🚀 Deployment

### Production Deployment

1. **Build Frontend**
   ```bash
   npm run build
   ```

2. **Deploy with Docker**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

3. **Environment Setup**
   - Configure production environment variables
   - Setup SSL certificates
   - Configure domain and DNS

### Environment-Specific Configurations

- **Development**: Debug logging, hot reload, CORS enabled
- **Staging**: Production-like with test data
- **Production**: Optimized builds, security headers, monitoring

## 🐛 Troubleshooting

### Common Issues

#### Prophet Import Errors
```bash
# Install Prophet dependencies
pip install pystan==2.19.1.1
pip install prophet

# macOS specific
brew install gcc
export CC=gcc
```

#### Authentication Failures
- Verify Supabase URL and keys
- Check JWT token expiration
- Ensure RLS policies are applied

#### Usage Limit Issues
- Check `prediction_usage` table
- Verify reset dates
- Run cleanup: `POST /api/v1/admin/usage/cleanup`

#### Performance Issues
- Enable prediction caching
- Optimize Prophet parameters
- Review transaction data volume

### Debug Commands

```bash
# Check Python packages
cd prediction_api
source venv/bin/activate
python -c \"import prophet, pandas, fastapi; print('All packages OK')\"

# Test API endpoints
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/predictions/usage \\n  -H \"Authorization: Bearer <token>\"

# Check database connections
npm run prisma:studio
```

## 📈 Performance

### Optimization Tips

1. **Caching Strategy**
   - Enable 24-hour result caching
   - Use Redis for production
   - Implement CDN for static assets

2. **Prophet Model Tuning**
   - Adjust changepoint sensitivity
   - Optimize seasonality components
   - Limit forecast horizon

3. **Database Optimization**
   - Index prediction tables
   - Implement connection pooling
   - Regular cleanup of expired data

### Monitoring

- **API Performance**: Response times, error rates
- **Prophet Model**: Prediction accuracy, confidence scores
- **Usage Patterns**: User adoption, limit violations
- **Resource Usage**: CPU, memory, storage

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create feature branch: `git checkout -b feature/prophet-enhancement`
3. Make changes with tests
4. Submit pull request

### Code Standards

- **TypeScript**: Strict mode, proper typing
- **Python**: PEP 8, type hints, docstrings
- **Testing**: Unit tests for all new features
- **Documentation**: Update README and API docs

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

- 📧 **Email**: [Your support email]
- 💬 **Discord**: [Your Discord server]
- 🐛 **Issues**: [GitHub Issues](link-to-issues)
- 📖 **Documentation**: [Full Documentation](link-to-docs)

---

**Made with ❤️ using Facebook Prophet and FastAPI**