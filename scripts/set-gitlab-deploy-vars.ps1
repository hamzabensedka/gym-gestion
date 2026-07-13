# Sets GitLab CI/CD variables for Vercel deploy pipeline.
# Usage: .\scripts\set-gitlab-deploy-vars.ps1 -GitLabToken "glpat-xxxxxxxx"
param(
  [Parameter(Mandatory = $true)]
  [string]$GitLabToken,
  [string]$ProjectPath = "hamzabensedka/gym-managment",
  [string]$VercelToken,
  [string]$VercelOrgId = "team_Uv6Ncv75ssG0axYOfjzzjAHW",
  [string]$VercelProjectId = "prj_YgKlazY6Qy5EC5gvlxiyQDgEhVUX",
  [string]$AppUrl = "https://gym-gestion-nine.vercel.app",
  [string]$ProductionDatabaseUrl
)

$ErrorActionPreference = "Stop"
$headers = @{ "PRIVATE-TOKEN" = $GitLabToken }
$encodedPath = [uri]::EscapeDataString($ProjectPath)
$project = Invoke-RestMethod -Uri "https://gitlab.com/api/v4/projects/$encodedPath" -Headers $headers
$projectId = $project.id
Write-Host "Project: $($project.path_with_namespace) (id=$projectId)"

if (-not $VercelToken) {
  $authPath = Join-Path $env:APPDATA "xdg.data\com.vercel.cli\auth.json"
  if (Test-Path $authPath) {
    $VercelToken = (Get-Content $authPath | ConvertFrom-Json).token
    Write-Host "Using Vercel token from local CLI auth.json"
  } else {
    throw "Pass -VercelToken or log in with `vercel login` first."
  }
}

if (-not $ProductionDatabaseUrl) {
  Push-Location (Split-Path $PSScriptRoot -Parent)
  try {
    $ProductionDatabaseUrl = (npx neonctl connection-string --project-id delicate-night-44453919 --org-id org-shy-fog-29799324 --pooled 2>$null).Trim()
  } finally {
    Pop-Location
  }
  if (-not $ProductionDatabaseUrl) {
    Write-Warning "Could not read Neon URL; skip PRODUCTION_DATABASE_URL or pass -ProductionDatabaseUrl"
  }
}

function Set-GitLabVariable {
  param([string]$Key, [string]$Value, [switch]$Masked, [switch]$Protected)
  if (-not $Value) { return }
  $exists = $false
  try {
    $null = Invoke-RestMethod -Uri "https://gitlab.com/api/v4/projects/$projectId/variables/$Key" -Headers $headers
    $exists = $true
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -ne 404) { throw }
  }
  if ($exists) {
    $body = @{
      value = $Value
      masked = [bool]$Masked
      protected = [bool]$Protected
    } | ConvertTo-Json
    Invoke-RestMethod -Method Put -Uri "https://gitlab.com/api/v4/projects/$projectId/variables/$Key" -Headers $headers -Body $body -ContentType "application/json" | Out-Null
    Write-Host "Updated $Key"
  } else {
    $body = @{
      key = $Key
      value = $Value
      masked = [bool]$Masked
      protected = [bool]$Protected
    } | ConvertTo-Json
    Invoke-RestMethod -Method Post -Uri "https://gitlab.com/api/v4/projects/$projectId/variables" -Headers $headers -Body $body -ContentType "application/json" | Out-Null
    Write-Host "Created $Key"
  }
}

Set-GitLabVariable -Key "VERCEL_TOKEN" -Value $VercelToken -Masked -Protected
Set-GitLabVariable -Key "VERCEL_ORG_ID" -Value $VercelOrgId -Protected
Set-GitLabVariable -Key "VERCEL_PROJECT_ID" -Value $VercelProjectId -Protected
Set-GitLabVariable -Key "APP_URL" -Value $AppUrl -Protected
Set-GitLabVariable -Key "PRODUCTION_DATABASE_URL" -Value $ProductionDatabaseUrl -Protected

Write-Host "Done. Push to main or run a pipeline to deploy."
