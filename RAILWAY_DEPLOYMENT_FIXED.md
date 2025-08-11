# 🚂 FisioFlow - Railway Deployment Guide (FIXED)

## 🛠️ Issues Fixed

### 1. **Database Foreign Key Type Mismatch**
- **Problem**: `users.id` was INTEGER but `user_profiles.user_id` expected VARCHAR(36)
- **Solution**: Created migration `004_fix_user_id_types.py` to handle schema conflicts
- **Status**: ✅ FIXED

### 2. **Migration Syntax Errors**
- **Problem**: Missing condition in migration file
- **Solution**: Fixed syntax in `001_initial_auth_tables.py`
- **Status**: ✅ FIXED

### 3. **Missing Dockerfile**
- **Problem**: No proper Dockerfile for Railway deployment
- **Solution**: Created optimized `backend/Dockerfile`
- **Status**: ✅ FIXED

### 4. **Deployment Configuration**
- **Problem**: Inconsistent Railway configuration
- **Solution**: Updated `railway.json` and entrypoint scripts
- **Status**: ✅ FIXED

## 🚀 Deployment Steps

### Step 1: Environment Variables
Set these in Railway Dashboard:

```bash
# Required Variables
SECRET_KEY="your-super-secret-key-min-32-chars"
JWT_SECRET_KEY="your-jwt-secret-key-min-32-chars"  
ENCRYPTION_KEY="your-32-byte-encryption-key"
NEON_DATABASE_URL="postgresql://user:pass@host:port/db"

# App Configuration
FLASK_ENV="production"
DEBUG="false"
NODE_ENV="production"

# Optional (with defaults)
CORS_ORIGINS="*"
LOG_LEVEL="INFO"
RATE_LIMIT_PER_MINUTE="60"
RATE_LIMIT_PER_HOUR="1000"
```

### Step 2: Deploy Backend

1. **Connect Repository**:
   - Go to Railway Dashboard
   - Click "New Project" → "Deploy from GitHub"
   - Select your repository

2. **Configure Service**:
   - Service Name: `fisioflow-backend`
   - Root Directory: Leave empty (uses root)
   - Build Command: Auto-detected from Dockerfile

3. **Add Environment Variables**:
   - Copy variables from Step 1
   - Make sure `NEON_DATABASE_URL` is set correctly

4. **Deploy**:
   - Railway will automatically build and deploy
   - Check logs for any issues

### Step 3: Verify Deployment

The deployment script will:
- ✅ Check all environment variables
- ✅ Test database connection
- ✅ Analyze existing schema conflicts
- ✅ Run migrations safely
- ✅ Verify health endpoint

## 📋 Files Created/Modified

### New Files:
- `backend/Dockerfile` - Production Docker configuration
- `backend/alembic/versions/004_fix_user_id_types.py` - Schema fix migration
- `backend/deploy_railway.py` - Comprehensive deployment script
- `railway.json` - Railway deployment configuration

### Modified Files:
- `backend/entrypoint.sh` - Enhanced startup script
- `backend/app/config.py` - Support for NEON_DATABASE_URL
- `backend/alembic/versions/001_initial_auth_tables.py` - Fixed syntax

## 🔍 Health Check

After deployment, verify:
```bash
curl https://your-app.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "message": "FisioFlow API is running",
  "version": "1.0.0"
}
```

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check environment variables in Railway
echo $DATABASE_URL
echo $NEON_DATABASE_URL

# Test connection manually
python -c "
import os
from sqlalchemy import create_engine
engine = create_engine(os.getenv('DATABASE_URL') or os.getenv('NEON_DATABASE_URL'))
engine.connect()
print('Connection successful')
"
```

### Migration Issues
```bash
# Check migration status
alembic current
alembic history

# Run specific migration
alembic upgrade 004  # Fix user ID types
```

### Build Issues
- Check Railway build logs
- Verify Dockerfile syntax
- Ensure all dependencies in requirements.txt

## 📊 Monitoring

Railway provides:
- **Logs**: Real-time application logs
- **Metrics**: CPU, Memory, Network usage
- **Health Checks**: Automatic health monitoring
- **Deployments**: Version history and rollbacks

## 🔐 Security Checklist

- ✅ SECRET_KEY is unique and secure (32+ chars)
- ✅ JWT_SECRET_KEY is different from SECRET_KEY
- ✅ ENCRYPTION_KEY is properly generated
- ✅ Database connection uses SSL (Neon default)
- ✅ CORS_ORIGINS is configured properly
- ✅ Rate limiting is enabled

## 🚀 Ready to Deploy!

Your FisioFlow backend is now ready for Railway deployment with all issues fixed!

### Quick Deploy Commands:
```bash
# Deploy backend
railway up

# Check status  
railway status

# View logs
railway logs

# Open in browser
railway open
```
