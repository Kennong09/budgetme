# 🚀 AWS EC2 Deployment Guide - Real Facebook Prophet Model

Complete guide to deploy the **REAL Facebook Prophet** machine learning model to AWS EC2.

---

## 📋 Prerequisites

### 1. AWS Account Setup
- AWS account with EC2 access
- AWS Free Tier eligible (12 months free)
- Basic knowledge of SSH and Linux

### 2. Local Machine Requirements
- SSH client installed
- Git installed
- Your Supabase credentials ready

---

## 🎯 Quick Start (Automated Deployment)

### Step 1: Launch EC2 Instance

1. **Go to AWS EC2 Console**: https://console.aws.amazon.com/ec2
2. **Click "Launch Instance"**
3. **Configure Instance:**
   - **Name**: `budgetme-prophet-api`
   - **AMI**: Ubuntu Server 22.04 LTS (Free tier eligible)
   - **Instance Type**: `t2.micro` (Free tier) or `t3.small` (Better performance - ~$15/month)
   - **Key Pair**: Create new or select existing (save the .pem file!)
   - **Network Settings**:
     - ✅ Allow SSH (port 22) from your IP
     - ✅ Allow HTTP (port 80) from anywhere (0.0.0.0/0)
     - ✅ Allow HTTPS (port 443) from anywhere (optional for SSL)
   - **Storage**: 20 GB (Free tier allows 30 GB)
4. **Click "Launch Instance"**

### Step 2: Connect to Your EC2 Instance

```bash
# Make your key file secure
chmod 400 your-key-pair.pem

# Connect via SSH (replace with your instance's public IP)
ssh -i your-key-pair.pem ubuntu@YOUR-EC2-PUBLIC-IP
```

### Step 3: Upload Deployment Files

On your local machine (in the budgetme project root):

```bash
# Copy the entire prediction_api folder to EC2
scp -i your-key-pair.pem -r prediction_api ubuntu@YOUR-EC2-PUBLIC-IP:~/
```

### Step 4: Run Automated Deployment

On your EC2 instance:

```bash
cd ~/prediction_api

# Make deployment script executable
chmod +x deploy-ec2.sh

# Run deployment (this takes 5-10 minutes)
sudo ./deploy-ec2.sh
```

### Step 5: Configure Environment Variables

```bash
# Edit the configuration file
sudo nano /home/budgetme/prediction_api/.env
```

Update these values:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_role_key_here
OPENROUTER_API_KEY=your_openrouter_key_here  # Optional for AI insights

# Update CORS with your frontend URL
CORS_ORIGINS=https://budgetme.site,http://localhost:3000
```

**Save and exit**: Press `Ctrl+X`, then `Y`, then `Enter`

### Step 6: Restart Service

```bash
# Restart the Prophet API service
sudo systemctl restart budgetme-prophet

# Check status
sudo systemctl status budgetme-prophet
```

### Step 7: Test Your Deployment

```bash
# Get your EC2 public IP
EC2_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
echo "Your API is at: http://$EC2_IP"

# Test health endpoint
curl http://$EC2_IP/health

# You should see: {"status":"healthy","prophet_available":true,...}
```

---

## 🎉 You're Live!

Your Prophet API is now running at: `http://YOUR-EC2-PUBLIC-IP`

**Available Endpoints:**
- 🏥 Health Check: `http://YOUR-EC2-PUBLIC-IP/health`
- 📚 API Docs: `http://YOUR-EC2-PUBLIC-IP/docs`
- 🔮 Predictions: `http://YOUR-EC2-PUBLIC-IP/api/v1/predictions/generate`

---

## 🔧 Configuration

### Update Frontend to Use EC2 API

Edit your frontend `.env` file:

```env
# Replace the Vercel URL with your EC2 IP
REACT_APP_PREDICTION_API_URL=http://YOUR-EC2-PUBLIC-IP
```

Then rebuild and redeploy your frontend:

```bash
npm run build
# Deploy to your hosting service
```

### Security Group Configuration

Ensure your EC2 Security Group allows:

| Type | Protocol | Port | Source | Purpose |
|------|----------|------|--------|---------|
| SSH | TCP | 22 | Your IP | Remote access |
| HTTP | TCP | 80 | 0.0.0.0/0 | API access |
| HTTPS | TCP | 443 | 0.0.0.0/0 | SSL (optional) |

---

## 🔒 Optional: Set Up SSL Certificate (HTTPS)

Make your API secure with a free SSL certificate:

### Prerequisites
- A domain name pointing to your EC2 IP
- DNS A record: `api.yourdomain.com -> YOUR-EC2-PUBLIC-IP`

### Install SSL

```bash
# Update Nginx configuration with your domain
sudo nano /etc/nginx/sites-available/budgetme-prophet
# Change "server_name _;" to "server_name api.yourdomain.com;"

# Get free SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Follow the prompts - select automatic HTTPS redirect
```

Your API will now be available at: `https://api.yourdomain.com`

---

## 🛠️ Management Commands

### Service Control

```bash
# Check service status
sudo systemctl status budgetme-prophet

# Start service
sudo systemctl start budgetme-prophet

# Stop service
sudo systemctl stop budgetme-prophet

# Restart service (after config changes)
sudo systemctl restart budgetme-prophet

# View real-time logs
sudo journalctl -u budgetme-prophet -f

# View last 100 log lines
sudo journalctl -u budgetme-prophet -n 100
```

### Update Deployment

```bash
# Pull latest changes from git
cd /home/budgetme/prediction_api
sudo -u budgetme git pull

# Install updated dependencies
sudo -u budgetme /home/budgetme/prediction_api/venv/bin/pip install -r requirements-production.txt

# Restart service
sudo systemctl restart budgetme-prophet
```

### Monitor Resources

```bash
# Check CPU and memory usage
htop

# Check disk space
df -h

# Check Prophet process
ps aux | grep uvicorn
```

---

## 📊 Verify Prophet is Working

### Test Prediction Generation

```bash
# Get your access token from Supabase
TOKEN="your_supabase_jwt_token"

# Test prediction endpoint
curl -X POST http://YOUR-EC2-PUBLIC-IP/api/v1/predictions/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_data": [
      {"date": "2024-01-01", "amount": 100, "type": "expense", "category": "groceries"},
      {"date": "2024-01-02", "amount": 150, "type": "expense", "category": "groceries"},
      {"date": "2024-01-03", "amount": 120, "type": "expense", "category": "groceries"},
      {"date": "2024-01-04", "amount": 200, "type": "income", "category": "salary"},
      {"date": "2024-01-05", "amount": 80, "type": "expense", "category": "groceries"},
      {"date": "2024-01-06", "amount": 90, "type": "expense", "category": "groceries"},
      {"date": "2024-01-07", "amount": 110, "type": "expense", "category": "groceries"}
    ],
    "timeframe": "months_3"
  }'
```

### Check Health Status

```bash
curl http://YOUR-EC2-PUBLIC-IP/health | jq
```

Expected response:
```json
{
  "status": "healthy",
  "service": "prediction-api",
  "prophet_available": true,  // ✅ This should be TRUE
  "database_connected": true,
  "version": "1.0.0"
}
```

---

## 🐛 Troubleshooting

### Service Won't Start

```bash
# Check error logs
sudo journalctl -u budgetme-prophet -n 50 --no-pager

# Common issues:
# 1. Missing environment variables - check /home/budgetme/prediction_api/.env
# 2. Permission issues - ensure files owned by budgetme user
# 3. Python dependencies - reinstall requirements-production.txt
```

### Prophet Import Error

```bash
# Verify Prophet is installed
sudo -u budgetme /home/budgetme/prediction_api/venv/bin/python -c "import prophet; print('Prophet OK')"

# If error, reinstall
cd /home/budgetme/prediction_api
sudo -u budgetme ./venv/bin/pip uninstall prophet pystan -y
sudo -u budgetme ./venv/bin/pip install pystan==2.19.1.1
sudo -u budgetme ./venv/bin/pip install prophet==1.1.5
```

### Memory Issues (t2.micro)

If you experience out-of-memory errors:

```bash
# Add swap space (2GB)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Or upgrade to `t3.small` instance (2GB RAM) via AWS Console.

### Nginx Issues

```bash
# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/budgetme-prophet-error.log
```

### Can't Connect from Frontend

1. **Check Security Group**: Ensure port 80 is open to 0.0.0.0/0
2. **Check CORS**: Update `CORS_ORIGINS` in `.env` file
3. **Check Firewall**: `sudo ufw status` (should be inactive on EC2)

---

## 💰 Cost Estimation

### Free Tier (12 months)
- ✅ **t2.micro instance**: FREE (750 hours/month)
- ✅ **30 GB storage**: FREE
- ✅ **Data transfer**: 15 GB/month FREE
- **Total**: $0/month for first year

### After Free Tier
- 💵 **t2.micro**: ~$8-10/month
- 💵 **t3.small** (recommended): ~$15-20/month
- 💵 **Storage (20GB)**: ~$2/month
- 💵 **Data transfer**: ~$1-5/month
- **Total**: $10-25/month

### Cost Optimization Tips
1. **Use Reserved Instances**: Save up to 40%
2. **Stop instance when not needed**: Only pay when running
3. **Use Auto Scaling**: Scale down during low usage
4. **Monitor with AWS Budgets**: Set alerts for spending

---

## 🎯 Production Recommendations

### For Better Performance

1. **Upgrade to t3.small**:
   - 2 GB RAM (vs 1 GB)
   - Better CPU performance
   - ~$15/month after free tier

2. **Add monitoring**:
   ```bash
   # Install CloudWatch agent
   wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
   sudo dpkg -i amazon-cloudwatch-agent.deb
   ```

3. **Enable automatic backups**:
   - Use EBS snapshots
   - Or AWS Backup service

4. **Set up Auto Scaling**:
   - Create AMI of configured instance
   - Set up Launch Template
   - Create Auto Scaling Group

### Security Best Practices

1. **Restrict SSH access**:
   ```bash
   # Only allow your IP
   # Update Security Group: SSH (22) -> My IP only
   ```

2. **Enable automatic security updates**:
   ```bash
   sudo apt install unattended-upgrades
   sudo dpkg-reconfigure --priority=low unattended-upgrades
   ```

3. **Use IAM roles** instead of AWS keys

4. **Enable VPC Flow Logs** for network monitoring

---

## 📚 Additional Resources

- **AWS EC2 Documentation**: https://docs.aws.amazon.com/ec2/
- **Prophet Documentation**: https://facebook.github.io/prophet/
- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **Nginx Documentation**: https://nginx.org/en/docs/
- **Ubuntu Server Guide**: https://ubuntu.com/server/docs

---

## 🆘 Need Help?

If you encounter issues:

1. **Check logs**: `sudo journalctl -u budgetme-prophet -n 100`
2. **Verify Prophet**: Test import in Python
3. **Check resources**: `htop` for CPU/memory
4. **Test endpoints**: Use `/health` endpoint
5. **Review security group**: Ensure ports are open

---

## ✅ Deployment Checklist

- [ ] EC2 instance launched (Ubuntu 22.04)
- [ ] Security group configured (ports 22, 80, 443)
- [ ] SSH key pair downloaded and secured
- [ ] Connected to EC2 instance
- [ ] Uploaded prediction_api files
- [ ] Ran deploy-ec2.sh script
- [ ] Updated .env with Supabase credentials
- [ ] Restarted budgetme-prophet service
- [ ] Tested /health endpoint - `prophet_available: true`
- [ ] Updated frontend with EC2 IP
- [ ] Tested prediction generation
- [ ] (Optional) Set up SSL certificate

---

**🎉 Congratulations! You're now running the REAL Facebook Prophet model on AWS EC2!**

Your financial predictions are powered by production-grade machine learning! 🚀
