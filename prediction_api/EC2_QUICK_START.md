# ⚡ EC2 Quick Start - Deploy Prophet in 10 Minutes

The fastest way to deploy Facebook Prophet to AWS EC2.

---

## 🎯 One-Command Deployment

### Prerequisites (5 minutes)
1. Create AWS account: https://aws.amazon.com/free
2. Launch Ubuntu EC2 instance (t2.micro or better)
3. Configure security group: Allow ports 22, 80, 443

### Deploy (5 minutes)

**On your local machine:**
```bash
# From budgetme project root
cd prediction_api

# Upload to EC2 (replace with your IP and key)
scp -i ~/your-key.pem -r . ubuntu@YOUR-EC2-IP:~/prediction_api
```

**On EC2 instance:**
```bash
# SSH into EC2
ssh -i ~/your-key.pem ubuntu@YOUR-EC2-IP

# Deploy
cd ~/prediction_api
chmod +x deploy-ec2.sh
sudo ./deploy-ec2.sh

# Configure (add your Supabase credentials)
sudo nano /home/budgetme/prediction_api/.env

# Restart
sudo systemctl restart budgetme-prophet
```

**Test:**
```bash
curl http://YOUR-EC2-IP/health
# Should show: "prophet_available": true
```

---

## 🎉 Done!

Your API is live at: `http://YOUR-EC2-IP`

**Update your frontend:**
```bash
# In budgetme root directory
nano .env

# Add/update:
REACT_APP_PREDICTION_API_URL=http://YOUR-EC2-IP

# Rebuild
npm run build
```

---

## 📋 Required Environment Variables

Edit `/home/budgetme/prediction_api/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...your-key
SUPABASE_SERVICE_KEY=eyJhbGc...your-service-key
CORS_ORIGINS=https://budgetme.site,http://localhost:3000
```

Get these from: https://app.supabase.com → Your Project → Settings → API

---

## 🔧 Essential Commands

```bash
# Check status
sudo systemctl status budgetme-prophet

# View logs
sudo journalctl -u budgetme-prophet -f

# Restart service
sudo systemctl restart budgetme-prophet

# Test Prophet
curl http://YOUR-EC2-IP/health | grep prophet_available
```

---

## 💡 Common Issues

**Service not starting?**
```bash
sudo journalctl -u budgetme-prophet -n 50
```

**Prophet import error?**
```bash
cd /home/budgetme/prediction_api
sudo -u budgetme ./venv/bin/pip install --force-reinstall prophet==1.1.5
sudo systemctl restart budgetme-prophet
```

**Can't access from browser?**
- Check EC2 Security Group: port 80 must be open to 0.0.0.0/0
- Check service: `sudo systemctl status budgetme-prophet`

---

## 📚 Full Documentation

See `AWS_EC2_DEPLOYMENT.md` for complete details including:
- SSL setup
- Monitoring
- Auto-scaling
- Cost optimization
- Security best practices

---

## 🎊 Success Indicators

✅ Service status: `active (running)`
✅ Health check: `prophet_available: true`
✅ API docs: `http://YOUR-EC2-IP/docs`
✅ Test prediction works from frontend

**You're now running REAL Facebook Prophet ML model! 🚀**
