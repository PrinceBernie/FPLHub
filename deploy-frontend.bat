@echo off
echo Building frontend for production...
cd frontend
npm run build
echo.
echo Frontend build complete! 
echo.
echo Next steps:
echo 1. Go to https://vercel.com
echo 2. Import your GitHub repository
echo 3. Set build command: cd frontend ^&^& npm run build
echo 4. Set output directory: frontend/build
echo 5. Deploy!
echo.
echo Or drag and drop the 'frontend/build' folder to Netlify
pause
