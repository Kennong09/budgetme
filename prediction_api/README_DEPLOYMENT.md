# BudgetMe Prediction API - Render.com Deployment

This directory contains the BudgetMe AI Prediction Service built with FastAPI and Facebook Prophet for financial forecasting.

## 🚀 Quick Deploy to Render.com

### Option 1: Using Render.com Dashboard
1. Fork this repository or push to your GitHub
2. Connect your GitHub account to Render.com
3. Create a new Web Service
4. Select this repository and set the root directory to `prediction_api`
5. Configure environment variables (see below)
6. Deploy!

### Option 2: Using render.yaml (Automatic)
1. Push the `render.yaml` file to your repository
2. Connect repository to Render.com
3. Render will automatically detect and deploy using the configuration

## 🔧 Environment Variables

Set these in your Render.com service dashboard:

### Required
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_KEY`: Your Supabase service role key

### Optional
- `OPENROUTER_API_KEY`: For AI insights (optional)
- `PREDICTION_API_KEY`: For service-to-service authentication
- `DEBUG`: Set to `false` for production
- `LOG_LEVEL`: Set to `INFO` or `ERROR`
- `CORS_ORIGINS`: Comma-separated list of allowed origins

## 📋 Requirements

All dependencies are listed in `requirements.txt` and will be automatically installed:

- **FastAPI**: Web framework
- **Prophet**: Facebook's time series forecasting tool
- **Supabase**: Database and authentication
- **Uvicorn**: ASGI server
- **Pandas/Numpy**: Data processing
- **Pydantic**: Data validation

## 🏗️ Service Configuration

### Build Command
```bash
pip install -r requirements.txt
```

### Start Command
```bash
python -m uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Health Check
The service provides a health check endpoint at `/health`

## 🛠️ Local Development

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run the service:
```bash
python main.py
```

## 📊 API Endpoints

- `GET /` - Root endpoint with service info
- `GET /health` - Health check
- `POST /api/v1/predictions/generate` - Generate predictions
- `GET /api/v1/admin/health` - Admin health check
- `GET /docs` - Interactive API documentation

## 🔒 Security Features

- JWT token validation via Supabase
- Rate limiting and usage quotas
- Input validation with Pydantic
- Secure environment variable handling

## 📝 Monitoring

The service includes:
- Structured JSON logging
- Health check endpoints
- Error tracking and reporting
- Performance metrics

## 🚨 Troubleshooting

### Common Issues

1. **Prophet Installation**: Prophet requires specific system dependencies. The Dockerfile includes all necessary packages.

2. **Memory Usage**: Prophet can be memory-intensive. Consider upgrading to a higher Render.com plan if needed.

3. **Database Connection**: Ensure Supabase environment variables are correctly set.

4. **Port Binding**: Render.com sets the `PORT` environment variable automatically.

### Logs

Check your Render.com service logs for detailed error information. Logs are structured in JSON format for easy parsing.

## 📚 Documentation

- API Documentation: Available at `/docs` when running
- Prophet Documentation: https://facebook.github.io/prophet/
- FastAPI Documentation: https://fastapi.tiangolo.com/
- Render.com Documentation: https://render.com/docs

## 🆘 Support

If you encounter issues:
1. Check the Render.com service logs
2. Verify environment variables are set correctly
3. Ensure your Supabase instance is accessible
4. Check the GitHub repository for updates

---

**Note**: This service is optimized for Render.com deployment with automatic scaling and monitoring capabilities.