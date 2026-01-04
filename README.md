# BudgetMe - AI-Powered Personal Finance Tracker

A comprehensive TypeScript-based personal finance tracker featuring AI-driven forecasting, transaction categorization, and intelligent budgeting insights. Built with React, Supabase, and advanced machine learning capabilities.

## 🚀 Features

### 💡 AI & Machine Learning
- **ARIMA-based forecasting** powered by TensorFlow.js
- **Automatic transaction categorization** using KNN and SVM algorithms  
- **Prophet-based predictions** via Python backend with Supabase integration
- **Accuracy monitoring** and anomaly detection for financial predictions

### 💰 Budget & Transaction Management
- Full CRUD operations for expenses and income with smart categorization
- Dynamic budget vs. actual comparisons with interactive visualizations
- Support for recurring expenses, OCR-based receipt processing, and split transactions
- Goal setting and tracking with progress visualization

### 📊 Analytics & Reporting  
- Interactive charts (line, bar, pie) for trend analysis and category breakdowns
- Exportable financial reports and tax summaries
- Real-time dashboard with key financial metrics
- Historical data analysis and insights

### 👥 Multi-User Support
- Supabase JWT authentication with two-factor authentication
- Role-based access control for families and shared accounts
- Collaborative budgeting and expense tracking

### 🔧 Technical Features
- TypeScript with strict mode for robust type safety
- Responsive React UI with modern design patterns
- Supabase backend with real-time synchronization
- Docker containerization for easy deployment

## 🛠️ Technology Stack

**Frontend:**
- React 18 with TypeScript
- TailwindCSS for styling
- Chart.js & Highcharts for visualizations
- React Router for navigation

**Backend:**
- Supabase (PostgreSQL + Auth + Real-time)
- Python prediction API with Prophet
- Prisma ORM for database management

**AI/ML:**
- TensorFlow.js for in-browser training
- Python Prophet for time series forecasting
- Custom ML models for transaction categorization

## 📋 Prerequisites

- Node.js (v18 or higher)
- Python 3.8+ (for prediction API)
- Supabase account and project
- Git

## 🚀 How to Run

### 1. Clone and Setup
```bash
git clone <repository-url>
cd budgetme
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```bash
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_PREDICTION_API_URL=http://localhost:5000
```

### 3. Database Setup
```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed the database (optional)
npm run prisma:seed
```

### 4. Start the Application

#### Option A: Frontend Only
```bash
npm start
# or
npm run dev
```

#### Option B: Full Stack (Frontend + Prediction API)
```bash
# Install Python dependencies
npm run prediction-api:install

# Start both frontend and prediction API
npm run dev:full
```

#### Option C: Individual Services
```bash
# Frontend only
npm run dev

# Prediction API only  
npm run prediction-api:dev
```

The application will be available at `http://localhost:3000`

## 🧪 How to Test

### Frontend Tests
```bash
# Run all React tests
npm test

# Run tests in watch mode
npm run test -- --watch

# Generate coverage report
npm run test -- --coverage --no-cache --watchAll=false
```

### Backend Tests
```bash
# Test database connections
npm run setup-database

# Run Prisma studio for database inspection
npm run prisma:studio
```

### Manual Testing
```bash
# Check TypeScript compilation
npm run tsc

# Run linting
npm run lint

# Format code
npm run format
```

## 📁 Project Structure

```
budgetme/
├── src/                          # React source code
│   ├── components/              
│   │   ├── auth/                # Authentication components
│   │   ├── budget/              # Budget management
│   │   ├── dashboard/           # Main dashboard
│   │   ├── family/              # Multi-user features
│   │   ├── predictions/         # AI predictions UI
│   │   ├── reports/             # Financial reports
│   │   └── transactions/        # Transaction management
│   ├── utils/                   # Utility functions and helpers
│   └── data/                    # Data models and types
├── prediction_api/              # Python ML backend
├── prisma/                      # Database schema and migrations
├── public/                      # Static assets
├── tests/                       # Test files
└── docs/                        # Documentation
```

## 🔧 Development Commands

```bash
# Database operations
npm run prisma:generate         # Generate Prisma client
npm run prisma:migrate         # Run migrations
npm run prisma:studio          # Open database browser
npm run prisma:reset          # Reset database

# Code quality
npm run lint                  # Check code style
npm run lint:fix             # Fix linting issues
npm run format              # Format code
npm run format:fix          # Format and fix code

# Build and deployment
npm run build               # Production build
npm run build:ci           # CI build (no warnings as errors)
```

## 🐳 Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build

# Run in production mode
docker-compose -f docker-compose.prod.yml up -d
```

## 📚 Documentation

- [AI Insights Setup](./AI_INSIGHTS_SETUP.md)
- [Prophet Implementation](./PROPHET_README.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE_FORMAT_STRING_FIX.md)
- [Family Module Documentation](./DFD-Family.md)
- [API Documentation](./docs/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check existing documentation in the `docs/` folder
- Review troubleshooting guides (*.md files in root)
- Open an issue for bugs or feature requests

## 🔮 Roadmap

- [ ] Advanced AI insights and recommendations
- [ ] Mobile app development
- [ ] Integration with banking APIs
- [ ] Advanced tax optimization features
- [ ] Investment portfolio tracking