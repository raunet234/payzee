# 🚀 Deploying Payzee Dashboard to Vercel

## ✅ Issue Fixed!

The 404 NOT_FOUND error has been resolved by adding proper Vercel configuration.

---

## 📁 Files Created

I've added these files to fix the deployment:

### 1. **`vercel.json`** - Main configuration
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**What this does:**
- ✅ Tells Vercel to use Vite framework
- ✅ Sets correct build output directory (`dist`)
- ✅ Handles React Router routes (all routes → index.html)
- ✅ Prevents 404 errors on client-side routes

### 2. **`.vercelignore`** - Excludes unnecessary files
```
node_modules
.git
dist
*.log
```

**What this does:**
- ✅ Speeds up deployment (doesn't upload node_modules)
- ✅ Reduces deployment size
- ✅ Excludes temporary files

---

## 🔧 Build Test Results

I tested the build locally - **SUCCESSFUL!** ✅

```
✓ 437 modules transformed
✓ built in 2.31s

Output:
- dist/index.html         0.48 kB
- dist/assets/*.css      23.61 kB
- dist/assets/*.js      633.18 kB

Status: Ready to deploy!
```

---

## 🚀 Deployment Steps

### **Option 1: Deploy via Vercel CLI (Recommended)**

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Navigate to dashboard directory:**
   ```bash
   cd "c:\temp\payzee\stellar pay\dashboard"
   ```

3. **Login to Vercel:**
   ```bash
   vercel login
   ```

4. **Deploy:**
   ```bash
   vercel
   ```

5. **Follow prompts:**
   ```
   ? Set up and deploy "~/dashboard"? [Y/n] Y
   ? Which scope? Select your account
   ? Link to existing project? [y/N] N
   ? What's your project's name? payzee
   ? In which directory is your code located? ./
   ```

6. **For production deployment:**
   ```bash
   vercel --prod
   ```

---

### **Option 2: Deploy via Vercel Dashboard (GUI)**

1. **Go to:** https://vercel.com/new

2. **Import from Git:**
   - Click "Import Project"
   - Connect your GitHub/GitLab/Bitbucket
   - Select the repository

3. **Configure Project:**
   ```
   Framework Preset: Vite
   Root Directory: dashboard
   Build Command: npm run build
   Output Directory: dist
   ```

4. **Environment Variables** (if needed):
   - None required for frontend!
   - Backend URL is hardcoded in Dashboard.jsx

5. **Click "Deploy"**

6. **Wait for deployment** (~2-3 minutes)

7. **Get deployment URL:**
   - Example: `https://payzee-xyz.vercel.app`

---

### **Option 3: Push to Git (Auto-Deploy)**

If you have Git connected:

1. **Commit the new files:**
   ```bash
   git add dashboard/vercel.json dashboard/.vercelignore
   git commit -m "Add Vercel configuration"
   git push
   ```

2. **Vercel auto-deploys:**
   - Every push to main → production deploy
   - Every PR → preview deploy

---

## 🔍 Verifying the Deployment

### **After deployment, test these URLs:**

1. **Homepage:**
   ```
   https://your-app.vercel.app/
   ```
   Should show the Landing page

2. **Dashboard Route:**
   ```
   https://your-app.vercel.app/app
   ```
   Should show the Dashboard (not 404!)

3. **With Query Parameters:**
   ```
   https://your-app.vercel.app/app?amount=50&merchant=Test
   ```
   Should pre-fill amount and merchant

---

## 🌐 Updating the Browser Extension

Once deployed, update the extension to use your production URL:

### **File:** `extension/content.js`

**Line 5-6, change:**
```javascript
// BEFORE (local development)
const DEV_MODE = true;
const DASHBOARD_URL = DEV_MODE ? 'http://localhost:3001' : 'https://payzee-omega.vercel.app';
```

**AFTER (production):**
```javascript
const DEV_MODE = false;  // ← Change to false
const DASHBOARD_URL = 'https://YOUR-VERCEL-URL.vercel.app';  // ← Your actual URL
```

Or better yet, auto-detect:
```javascript
const DEV_MODE = window.location.hostname === 'localhost';
const DASHBOARD_URL = DEV_MODE 
  ? 'http://localhost:3001' 
  : 'https://your-actual-vercel-url.vercel.app';
```

---

## 🐛 Troubleshooting

### **Still getting 404?**

**Possible causes:**

1. **Route configuration not applied**
   - ✅ Make sure `vercel.json` is in `dashboard/` directory
   - ✅ Redeploy after adding the file

2. **Build failed**
   - ✅ Check Vercel build logs
   - ✅ Run `npm run build` locally first

3. **Wrong output directory**
   - ✅ Verify `dist/` folder exists after build
   - ✅ Check `vite.config.js` has `outDir: 'dist'`

### **Build errors on Vercel?**

**Check these:**

1. **Node version:**
   - Add to `package.json`:
   ```json
   "engines": {
     "node": "18.x"
   }
   ```

2. **Missing dependencies:**
   - Make sure all packages are in `dependencies`, not `devDependencies`

3. **Build command:**
   - Vercel should use: `npm run build`
   - Check Vercel dashboard settings

### **Blank page after deployment?**

**Check console for errors:**

1. **API endpoint issues:**
   - Backend URL might be wrong
   - Update `BACKEND_URL` in `Dashboard.jsx` if needed

2. **Missing environment variables:**
   - Add in Vercel dashboard → Settings → Environment Variables

3. **CORS errors:**
   - Backend needs to allow your Vercel domain

---

## 📊 Deployment Checklist

Before deploying, verify:

- ✅ `vercel.json` exists in `dashboard/` folder
- ✅ `.vercelignore` exists in `dashboard/` folder
- ✅ `npm run build` works locally
- ✅ `dist/` folder is created after build
- ✅ Git repo is pushed (if using Git integration)
- ✅ Vercel account is ready
- ✅ Backend is deployed and accessible

After deploying, verify:

- ✅ Homepage loads (`/`)
- ✅ Dashboard loads (`/app`)
- ✅ Wallet connection works
- ✅ No 404 on route changes
- ✅ Extension points to new URL
- ✅ API calls reach backend

---

## 🎯 Next Steps After Deployment

1. **Get your deployment URL**
   - Example: `https://payzee-abc123.vercel.app`

2. **Update extension** (see above)

3. **Test full flow:**
   - Install updated extension
   - Go to checkout page
   - Click "Pay with Payzee"
   - Should open YOUR Vercel URL (not localhost)

4. **Set up custom domain** (optional):
   - Vercel → Project → Settings → Domains
   - Add: `payzee.yourname.com`

5. **Enable production backend:**
   - Deploy backend to Railway/Render/etc.
   - Update `BACKEND_URL` in Dashboard.jsx
   - Redeploy

---

## 🔐 Security Considerations

### **Before going live:**

1. **Update API keys:**
   - Don't hardcode API keys in frontend!
   - Move to environment variables
   - Use Vercel environment variables

2. **Backend URL:**
   - Update to production backend
   - Enable CORS for Vercel domain only

3. **Wallet security:**
   - Sui Wallet integration is client-side (secure)
   - No private keys in code ✅

### **In `Dashboard.jsx`:**

Current (development):
```javascript
const BACKEND_URL = import.meta.env.DEV
    ? 'http://localhost:8000'
    : 'https://payzee-production.up.railway.app'
```

This is good! It auto-switches based on environment.

---

## 📝 Summary

**What was fixed:**
- ✅ Added `vercel.json` for proper routing
- ✅ Added `.vercelignore` for clean deployment
- ✅ Tested build locally (successful)
- ✅ Configured SPA rewrites for React Router

**What to do now:**
1. Deploy using one of the 3 methods above
2. Verify deployment works
3. Update browser extension
4. Test full flow

**Your app should now deploy successfully to Vercel!** 🎉

---

## 🆘 Need Help?

If you still get errors:

1. **Share the Vercel build log** - Copy from Vercel dashboard
2. **Share the error message** - Full text
3. **Check browser console** - Look for errors on deployed site

Common fixes:
- Redeploy after adding `vercel.json`
- Clear Vercel cache and rebuild
- Check Node version compatibility
- Verify all dependencies are installed

---

## 🎊 Success!

Once deployed, your dashboard will be live at:
```
https://your-project.vercel.app
```

And anyone can use it to pay with crypto! 🚀
