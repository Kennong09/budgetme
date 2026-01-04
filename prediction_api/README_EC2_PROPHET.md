# 🚀 Deploy Real Facebook Prophet to AWS EC2

## ⚡ Quick Links

- 📖 **[Complete Deployment Guide](AWS_EC2_DEPLOYMENT.md)** - Full documentation
- ⚡ **[Quick Start (10 min)](EC2_QUICK_START.md)** - Fast setup
- 📜 **[Deployment Script](deploy-ec2.sh)** - Automated installer

---

## 🎯 What You're Deploying

### Real Prophet ML Model
✅ **Facebook Prophet 1.1.5** - Production ML library  
✅ **Time Series Forecasting** - Advanced pattern detection  
✅ **Seasonality Analysis** - Automatic trend identification  
✅ **Confidence Intervals** - Statistical accuracy metrics  
✅ **Category Predictions** - Per-category forecasting  

### VS Mock Implementation
❌ Vercel deployment uses a **mock/minimal version** (Prophet too large for serverless)  
✅ EC2 deployment uses the **REAL Prophet model** with full ML capabilities  

---

## 📋 Prerequisites

1. **AWS Account** - Free tier eligible
2. **EC2 Instance** - Ubuntu 22.04, t2.micro or better
3. **Security Group** - Ports 22, 80, 443 open
4. **Supabase Credentials** - URL and API keys

---

## 🚀 Deploy in 3 Steps

### Step 1: Upload Files to EC2
```bash
# From your local machine
scp -i your-key.pem -r prediction_api ubuntu@YOUR-EC2-IP:~/
```

### Step 2: Run Deployment Script
```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@YOUR-EC2-IP

# Deploy
cd ~/prediction_api
chmod +x deploy-ec2.sh
sudo ./deploy-ec2.sh
```

### Step 3: Configure & Test
```bash
# Add your Supabase credentials
sudo nano /home/budgetme/prediction_api/.env

# Restart service
sudo systemctl restart budgetme-prophet

# Test
curl http://YOUR-EC2-IP/health
# Should show: "prophet_available": true ✅
```

---

## 📁 Files Overview

| File | Purpose |
|------|---------|
| `deploy-ec2.sh` | Automated deployment script |
| `requirements-production.txt` | Python dependencies with Prophet |
| `.env.example` | Configuration template |
| `AWS_EC2_DEPLOYMENT.md` | Complete guide |
| `EC2_QUICK_START.md` | Quick setup guide |
| `main.py` | FastAPI app with real Prophet |
| `models/prophet_forecaster.py` | Prophet ML model |

---

## 🎓 How It Works

```
┌─────────────────────────────────────────────────┐
│          BudgetMe Frontend (React)              │
│  https://budgetme.site/predictions              │
└──────────────────┬──────────────────────────────┘
                   │
                   │ HTTP Request
                   │ POST /api/v1/predictions/generate
                   │
┌──────────────────▼──────────────────────────────┐
│        AWS EC2 Instance (Ubuntu 22.04)          │
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │  Nginx (Reverse Proxy)                 │    │
│  │  Port 80 → 127.0.0.1:8000              │    │
│  └───────────────┬────────────────────────┘    │
│                  │                               │
│  ┌───────────────▼────────────────────────┐    │
│  │  FastAPI Application (Uvicorn)         │    │
│  │  Python 3.11 + Virtual Environment     │    │
│  └───────────────┬────────────────────────┘    │
│                  │                               │
│  ┌───────────────▼────────────────────────┐    │
│  │  Facebook Prophet ML Model 🧠           │    │
│  │  • Time series forecasting             │    │
│  │  • Seasonality detection               │    │
│  │  • Confidence calculations             │    │
│  │  • Category-specific predictions       │    │
│  └───────────────┬────────────────────────┘    │
│                  │                               │
└──────────────────┼───────────────────────────────┘
                   │
                   │ Database queries
                   │
┌──────────────────▼──────────────────────────────┐
│          Supabase PostgreSQL                     │
│  • Transaction data                              │
│  • Usage tracking                                │
│  • Prediction cache                              │
└──────────────────────────────────────────────────┘
```

---

## 💰 Costs

### Free Tier (12 months)
- ✅ t2.micro instance: **FREE** (750 hours/month)
- ✅ 30 GB storage: **FREE**
- ✅ Data transfer: **FREE** (15 GB/month)

### After Free Tier
- 💵 t2.micro: **~$10/month** (minimum)
- 💵 t3.small: **~$20/month** (recommended)

### Always Free Alternative
- 🎁 **Oracle Cloud**: 4 CPUs + 24GB RAM **FREE FOREVER**

---

## 🔧 Essential Commands

```bash
# Check service status
sudo systemctl status budgetme-prophet

# View logs in real-time
sudo journalctl -u budgetme-prophet -f

# Restart after config change
sudo systemctl restart budgetme-prophet

# Test Prophet
curl http://YOUR-EC2-IP/health | grep prophet_available

# Edit configuration
sudo nano /home/budgetme/prediction_api/.env
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Service running: `sudo systemctl status budgetme-prophet`
- [ ] Health check works: `curl http://YOUR-EC2-IP/health`
- [ ] Prophet available: Response shows `"prophet_available": true`
- [ ] API docs accessible: `http://YOUR-EC2-IP/docs`
- [ ] Frontend updated with EC2 IP in `.env`
- [ ] Test prediction works from frontend

---

## 🐛 Common Issues

### Service won't start
```bash
sudo journalctl -u budgetme-prophet -n 50
```

### Prophet import error
```bash
cd /home/budgetme/prediction_api
sudo -u budgetme ./venv/bin/pip install --force-reinstall prophet==1.1.5
```

### Can't connect from browser
- Check Security Group: port 80 must be open to 0.0.0.0/0
- Check service: `sudo systemctl status budgetme-prophet`
- Check CORS in `.env`: Add your frontend URL

### Out of memory (t2.micro)
```bash
# Add 2GB swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## 📚 Additional Resources

- [Prophet Documentation](https://facebook.github.io/prophet/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [Nginx Documentation](https://nginx.org/en/docs/)

---

## 🎉 Success Indicators

When everything works:

```json
// GET http://YOUR-EC2-IP/health
{
  "status": "healthy",
  "service": "prediction-api",
  "prophet_available": true,  // ✅ REAL Prophet is working!
  "database_connected": true,
  "version": "1.0.0"
}
```

---

## 🆘 Need Help?

1. Read the **[Full Deployment Guide](AWS_EC2_DEPLOYMENT.md)**
2. Check **[Quick Start](EC2_QUICK_START.md)** for common fixes
3. Review service logs: `sudo journalctl -u budgetme-prophet -f`
4. Test health endpoint: `curl http://YOUR-EC2-IP/health`

---

**🚀 Ready to deploy? Start with [EC2_QUICK_START.md](EC2_QUICK_START.md)!**
