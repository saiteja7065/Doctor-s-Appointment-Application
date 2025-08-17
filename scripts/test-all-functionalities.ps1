# MedMe Doctor Appointment Application - Functionality Test Script
# This script tests all the implemented functionalities of the application

Write-Host "🏥 MedMe Doctor Appointment Application - Functionality Test Script" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan

# Set the base URL for API calls
$baseUrl = "http://localhost:3000"

# Create a function to make API calls
function Invoke-MedMeApi {
    param (
        [string]$Endpoint,
        [string]$Method = "GET",
        [object]$Body = $null,
        [hashtable]$Headers = @{},
        [switch]$IgnoreErrors
    )

    $url = "$baseUrl$Endpoint"
    $Headers["Content-Type"] = "application/json"
    
    Write-Host "🔄 Testing: $Method $url" -ForegroundColor Yellow
    
    try {
        if ($Body) {
            $bodyJson = $Body | ConvertTo-Json -Depth 10
            $response = Invoke-RestMethod -Uri $url -Method $Method -Body $bodyJson -Headers $Headers -ContentType "application/json" -ErrorAction Stop
        }
        else {
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $Headers -ErrorAction Stop
        }
        
        Write-Host "✅ Success: $Method $url" -ForegroundColor Green
        return $response
    }
    catch {
        if ($IgnoreErrors) {
            Write-Host "⚠️ Expected Error: $Method $url - $($_.Exception.Message)" -ForegroundColor Yellow
            return $null
        }
        else {
            Write-Host "❌ Error: $Method $url - $($_.Exception.Message)" -ForegroundColor Red
            return $null
        }
    }
}

# Function to run tests with a header
function Test-Feature {
    param (
        [string]$Name,
        [scriptblock]$Test
    )
    
    Write-Host "`n📋 Testing Feature: $Name" -ForegroundColor Magenta
    Write-Host "-------------------------------------" -ForegroundColor Magenta
    
    try {
        & $Test
        Write-Host "✅ $Name tests completed" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ $Name tests failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 1. Test Health Check Endpoint
Test-Feature -Name "Health Check" -Test {
    $response = Invoke-MedMeApi -Endpoint "/api/health"
    
    if ($response -and $response.status -eq "ok") {
        Write-Host "✅ Health check endpoint is working" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Health check endpoint failed" -ForegroundColor Red
        throw "Health check failed"
    }
}

# 2. Test MongoDB Connection
Test-Feature -Name "MongoDB Connection" -Test {
    $response = Invoke-MedMeApi -Endpoint "/api/test-db"
    
    if ($response -and $response.connected) {
        Write-Host "✅ MongoDB connection is working" -ForegroundColor Green
        Write-Host "   Database: $($response.database)" -ForegroundColor Green
    }
    else {
        Write-Host "❌ MongoDB connection failed" -ForegroundColor Red
        throw "MongoDB connection failed"
    }
}

# 3. Test Doctor Application Route (Demo Mode)
Test-Feature -Name "Doctor Application" -Test {
    $headers = @{
        "X-Demo-Mode" = "true"
    }
    
    $doctorApplication = @{
        specialty = "cardiology"
        licenseNumber = "MD123456"
        yearsOfExperience = 10
        education = "Harvard Medical School"
        bio = "Experienced cardiologist with 10+ years of practice"
        consultationFee = 150
        languages = @("English", "Spanish")
    }
    
    $response = Invoke-MedMeApi -Endpoint "/api/doctors/apply" -Method "POST" -Body $doctorApplication -Headers $headers
    
    if ($response -and $response.success) {
        Write-Host "✅ Doctor application submission is working (Demo Mode)" -ForegroundColor Green
        Write-Host "   Application ID: $($response.applicationId)" -ForegroundColor Green
        Write-Host "   Status: $($response.status)" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Doctor application submission failed" -ForegroundColor Red
        throw "Doctor application failed"
    }
}

# 4. Test Doctor Search Route
Test-Feature -Name "Doctor Search" -Test {
    $headers = @{
        "X-Demo-Mode" = "true"
    }
    
    $response = Invoke-MedMeApi -Endpoint "/api/doctors/search?specialty=cardiology" -Headers $headers
    
    if ($response -and $response.doctors -and $response.doctors.Count -gt 0) {
        Write-Host "✅ Doctor search is working" -ForegroundColor Green
        Write-Host "   Found $($response.doctors.Count) doctors" -ForegroundColor Green
        Write-Host "   First doctor: $($response.doctors[0].firstName) $($response.doctors[0].lastName)" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Doctor search failed" -ForegroundColor Red
        throw "Doctor search failed"
    }
}

# 5. Test Admin Overview Route (Demo Mode)
Test-Feature -Name "Admin Overview" -Test {
    $headers = @{
        "X-Demo-Mode" = "true"
    }
    
    $response = Invoke-MedMeApi -Endpoint "/api/admin/overview" -Headers $headers
    
    if ($response -and $response.stats) {
        Write-Host "✅ Admin overview is working (Demo Mode)" -ForegroundColor Green
        Write-Host "   Total Users: $($response.stats.totalUsers)" -ForegroundColor Green
        Write-Host "   Total Doctors: $($response.stats.totalDoctors)" -ForegroundColor Green
        Write-Host "   Total Appointments: $($response.stats.totalAppointments)" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Admin overview failed" -ForegroundColor Red
        throw "Admin overview failed"
    }
}

# 6. Test Notifications Check (Demo Mode)
Test-Feature -Name "Notifications" -Test {
    $headers = @{
        "X-Demo-Mode" = "true"
    }
    
    $response = Invoke-MedMeApi -Endpoint "/api/notifications/check" -Headers $headers
    
    if ($response -and $response.hasNotifications -ne $null) {
        Write-Host "✅ Notifications check is working (Demo Mode)" -ForegroundColor Green
        Write-Host "   Has Notifications: $($response.hasNotifications)" -ForegroundColor Green
        if ($response.notifications) {
            Write-Host "   Notification Count: $($response.notifications.Count)" -ForegroundColor Green
        }
    }
    else {
        Write-Host "❌ Notifications check failed" -ForegroundColor Red
        throw "Notifications check failed"
    }
}

# 7. Test Error Handling (Intentionally causing an error)
Test-Feature -Name "Error Handling" -Test {
    $response = Invoke-MedMeApi -Endpoint "/api/non-existent-endpoint" -IgnoreErrors
    
    if (-not $response) {
        Write-Host "✅ Error handling is working as expected" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Error handling test failed" -ForegroundColor Red
        throw "Error handling test failed"
    }
}

# 8. Run Jest Tests for Core Functionality
Test-Feature -Name "Jest Tests" -Test {
    Write-Host "Running Jest tests for core functionality..." -ForegroundColor Yellow
    
    try {
        Set-Location "e:\FULL STACK\Doctor Appointment Application\medme-app"
        $testOutput = npm test -- --testPathPattern="mongodb|doctors/apply|doctors/search" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Jest tests passed" -ForegroundColor Green
        }
        else {
            Write-Host "❌ Jest tests failed" -ForegroundColor Red
            Write-Host $testOutput -ForegroundColor Red
            throw "Jest tests failed"
        }
    }
    catch {
        Write-Host "❌ Error running Jest tests: $($_.Exception.Message)" -ForegroundColor Red
        throw "Jest tests execution failed"
    }
}

# Summary
Write-Host "`n📊 Test Summary" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "All functionality tests have been executed." -ForegroundColor Cyan
Write-Host "Please check the results above for any failures." -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan