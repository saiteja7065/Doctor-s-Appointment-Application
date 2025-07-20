# Apply fixes to the MedMe Doctor Appointment Application

Write-Host "Applying fixes to the MedMe Doctor Appointment Application..." -ForegroundColor Green

# Fix MongoDB connection issues
Write-Host "Fixing MongoDB connection module..." -ForegroundColor Yellow
Copy-Item -Path ".\medme-app\src\lib\mongodb.fixed.ts" -Destination ".\medme-app\src\lib\mongodb.ts" -Force
Write-Host "MongoDB connection module fixed." -ForegroundColor Green

# Fix doctor application route
Write-Host "Fixing doctor application route..." -ForegroundColor Yellow
Copy-Item -Path ".\medme-app\src\app\api\doctors\apply\route.fixed.ts" -Destination ".\medme-app\src\app\api\doctors\apply\route.ts" -Force
Write-Host "Doctor application route fixed." -ForegroundColor Green

# Fix doctor search route
Write-Host "Fixing doctor search route..." -ForegroundColor Yellow
Copy-Item -Path ".\medme-app\src\app\api\doctors\search\route.fixed.ts" -Destination ".\medme-app\src\app\api\doctors\search\route.ts" -Force
Write-Host "Doctor search route fixed." -ForegroundColor Green

# Fix doctor search test
Write-Host "Fixing doctor search test..." -ForegroundColor Yellow
Copy-Item -Path ".\medme-app\src\__tests__\api\doctors\search.test.fixed.ts" -Destination ".\medme-app\src\__tests__\api\doctors\search.test.ts" -Force
Write-Host "Doctor search test fixed." -ForegroundColor Green

# Fix doctor application test
Write-Host "Fixing doctor application test..." -ForegroundColor Yellow
Copy-Item -Path ".\medme-app\src\__tests__\api\doctors\apply.test.fixed.ts" -Destination ".\medme-app\src\__tests__\api\doctors\apply.test.ts" -Force
Write-Host "Doctor application test fixed." -ForegroundColor Green

# Fix email module
Write-Host "Fixing email module..." -ForegroundColor Yellow
Copy-Item -Path ".\medme-app\src\lib\email.fixed.ts" -Destination ".\medme-app\src\lib\email.ts" -Force
Write-Host "Email module fixed." -ForegroundColor Green

# Create .env.test file for test environment
Write-Host "Creating test environment configuration..." -ForegroundColor Yellow
@"
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/medme-test
RESEND_API_KEY=re_test_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
EMAIL_FROM=test@medme-app.com
"@ | Out-File -FilePath ".\medme-app\.env.test" -Encoding utf8 -Force
Write-Host "Test environment configuration created." -ForegroundColor Green

Write-Host "All fixes applied successfully!" -ForegroundColor Green
Write-Host "Run 'npm test' to verify the fixes." -ForegroundColor Cyan