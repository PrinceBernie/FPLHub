@echo off
echo Setting up CORS configuration for mobile access...

echo.
echo Adding CORS configuration to .env file...
echo # CORS Configuration for Mobile Access >> .env
echo ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://192.168.21.30:3000,http://192.168.21.30:3001,http://192.168.21.30:5000 >> .env
echo FRONTEND_URL=http://localhost:3000 >> .env
echo NODE_ENV=development >> .env

echo.
echo CORS configuration added successfully!
echo.
echo Your mobile device can now access the app using:
echo - http://192.168.21.30:3000 (if frontend runs on port 3000)
echo - http://192.168.21.30:3001 (if frontend runs on port 3001)
echo.
echo Make sure your mobile device is connected to the same WiFi network.
echo.
pause
