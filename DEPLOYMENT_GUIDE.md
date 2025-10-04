# 🚀 FPL Hub Deployment Guide

## Quick Deployment Options

### Option 1: Vercel (Frontend) + Railway (Backend) - RECOMMENDED

#### Frontend Deployment (Vercel)
1. **Push to GitHub** (if not already done)
2. **Go to [vercel.com](https://vercel.com)**
3. **Import your repository**
4. **Configure build settings:**
   - Build Command: `cd frontend && npm run build`
   - Output Directory: `frontend/build`
   - Install Command: `cd frontend && npm install`

#### Backend Deployment (Railway)
1. **Go to [railway.app](https://railway.app)**
2. **Connect your GitHub repository**
3. **Select the backend folder**
4. **Set environment variables:**
   ```
   DATABASE_URL=file:./prisma/dev.db
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=7d
   PORT=3000
   NODE_ENV=production
   FRONTEND_URL=https://your-frontend-url.vercel.app
   ```

5. **Update frontend API URL** in `frontend/src/services/api.ts`:
   ```typescript
   const getApiBaseUrl = () => {
     if (import.meta.env.VITE_API_BASE_URL) {
       return import.meta.env.VITE_API_BASE_URL;
     }
     return 'https://your-backend-url.railway.app/api';
   };
   ```

### Option 2: Netlify (Frontend) + Render (Backend)

#### Frontend Deployment (Netlify)
1. **Go to [netlify.com](https://netlify.com)**
2. **Drag and drop** your `frontend/build` folder
3. **Or connect GitHub** and set build command: `cd frontend && npm run build`

#### Backend Deployment (Render)
1. **Go to [render.com](https://render.com)**
2. **Create new Web Service**
3. **Connect GitHub repository**
4. **Set build command:** `cd backend && npm install`
5. **Set start command:** `cd backend && node server.js`

### Option 3: GitHub Pages (Frontend) + Railway (Backend)

#### Frontend Deployment (GitHub Pages)
1. **Install gh-pages:** `npm install --save-dev gh-pages`
2. **Add to package.json:**
   ```json
   "scripts": {
     "predeploy": "cd frontend && npm run build",
     "deploy": "gh-pages -d frontend/build"
   }
   ```
3. **Deploy:** `npm run deploy`

## Environment Variables Needed

### Backend (.env)
```
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="7d"
PORT=3000
NODE_ENV=production
FRONTEND_URL="https://your-frontend-url.vercel.app"
REDIS_URL=""
ADMIN_EMAIL="admin@fplhub.com"
ADMIN_PASSWORD="admin123"
FPL_API_BASE_URL="https://fantasy.premierleague.com/api"
```

### Frontend (Vercel Environment Variables)
```
VITE_API_BASE_URL=https://your-backend-url.railway.app/api
```

## Quick Commands

### Build Frontend
```bash
cd frontend
npm run build
```

### Test Backend Locally
```bash
cd backend
npm start
```

### Test Frontend Locally
```bash
cd frontend
npm run dev
```

## Troubleshooting

### Common Issues:
1. **CORS Errors**: Make sure `FRONTEND_URL` is set correctly in backend
2. **Database Issues**: Ensure SQLite file is included in deployment
3. **Build Failures**: Check Node.js version compatibility
4. **API Connection**: Verify API URLs are correct

### Mobile Access:
- Your app will be accessible from any device once deployed
- No need for local network configuration
- HTTPS will be automatically provided

## Cost Estimate:
- **Vercel**: Free tier (100GB bandwidth/month)
- **Railway**: Free tier (500 hours/month)
- **Total**: $0/month for testing

## Next Steps:
1. Choose your preferred option
2. Follow the deployment steps
3. Update API URLs
4. Test on mobile devices
5. Share the live URL!

Your app will be live and accessible from anywhere! 🌐
