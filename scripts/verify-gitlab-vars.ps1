# Lists GitLab CI/CD variable keys (not values) and latest pipeline status.
# Usage: .\scripts\verify-gitlab-vars.ps1 -GitLabToken "glpat-xxxxxxxx"
param(
  [Parameter(Mandatory = $true)]
  [string]$GitLabToken,
  [string]$ProjectPath = "hamzabensedka/gym-managment"
)

$headers = @{ "PRIVATE-TOKEN" = $GitLabToken }
$encodedPath = [uri]::EscapeDataString($ProjectPath)
$project = Invoke-RestMethod -Uri "https://gitlab.com/api/v4/projects/$encodedPath" -Headers $headers
Write-Host "Project: $($project.path_with_namespace) (id=$($project.id))"

Write-Host "`nCI/CD variables:"
$vars = Invoke-RestMethod -Uri "https://gitlab.com/api/v4/projects/$($project.id)/variables?per_page=100" -Headers $headers
$required = @("VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID", "APP_URL", "PRODUCTION_DATABASE_URL")
foreach ($key in $required) {
  $found = $vars | Where-Object { $_.key -eq $key }
  if ($found) {
    Write-Host "  [OK] $key (masked=$($found.masked), protected=$($found.protected))"
  } else {
    Write-Host "  [MISSING] $key"
  }
}

Write-Host "`nLatest pipelines:"
$pipes = Invoke-RestMethod -Uri "https://gitlab.com/api/v4/projects/$($project.id)/pipelines?per_page=3" -Headers $headers
foreach ($p in $pipes) {
  Write-Host "  $($p.status) | $($p.ref) | $($p.sha.Substring(0,8)) | $($p.web_url)"
}
