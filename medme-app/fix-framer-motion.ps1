# PowerShell script to remove framer-motion imports from all TypeScript/React files

$files = @(
    "src/app/dashboard/page.tsx",
    "src/app/dashboard/patient/appointments/page.tsx", 
    "src/app/dashboard/patient/doctors/[id]/book/page.tsx",
    "src/app/dashboard/patient/doctors/[id]/page.tsx",
    "src/app/dashboard/patient/notifications/page.tsx",
    "src/app/dashboard/patient/page.tsx",
    "src/app/dashboard/patient/profile/page.tsx",
    "src/app/dashboard/patient/settings/page.tsx",
    "src/app/dashboard/patient/subscription/page.tsx",
    "src/app/onboarding/doctor/page.tsx",
    "src/app/consultation/[sessionId]/page.tsx"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Processing $file"
        $content = Get-Content $file -Raw
        
        # Replace framer-motion import with comment
        $content = $content -replace "import \{ motion.*\} from 'framer-motion';", "// Removed framer-motion for better performance - using CSS animations"
        $content = $content -replace "import \{ motion.*\} from `"framer-motion`";", "// Removed framer-motion for better performance - using CSS animations"
        
        # Replace motion components with div elements
        $content = $content -replace "<motion\.div", "<div className=`"animate-fade-in-up`""
        $content = $content -replace "</motion\.div>", "</div>"
        $content = $content -replace "motion\.div", "div"
        
        # Remove motion props
        $content = $content -replace "\s*initial=\{[^}]*\}", ""
        $content = $content -replace "\s*animate=\{[^}]*\}", ""
        $content = $content -replace "\s*transition=\{[^}]*\}", ""
        $content = $content -replace "\s*exit=\{[^}]*\}", ""
        
        Set-Content $file $content -NoNewline
        Write-Host "Fixed $file"
    } else {
        Write-Host "File not found: $file"
    }
}

Write-Host "All files processed!"
