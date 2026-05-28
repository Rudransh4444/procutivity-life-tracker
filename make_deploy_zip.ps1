# PowerShell script to create a deployable ZIP excluding node_modules and .git
param(
  [string]$Source = "$(Resolve-Path .)",
  [string]$Out = "$(Resolve-Path ..)\local-ai-productivity-deploy.zip"
)

Write-Host "Creating ZIP from: $Source\nOutput: $Out"

if (Test-Path $Out) { Remove-Item $Out }

# Use Compress-Archive but exclude node_modules and .git
$items = Get-ChildItem -Path $Source -Recurse | Where-Object { $_.FullName -notmatch "\\node_modules\\|\\.git\\" }

$temp = Join-Path $env:TEMP "ai_deploy_temp"
if (Test-Path $temp) { Remove-Item -Recurse -Force $temp }
New-Item -ItemType Directory -Path $temp | Out-Null

foreach ($it in $items) {
  $rel = $it.FullName.Substring($Source.Length).TrimStart('\')
  $dest = Join-Path $temp $rel
  if ($it.PSIsContainer) { New-Item -ItemType Directory -Path $dest -Force | Out-Null }
  else {
    $dir = Split-Path $dest -Parent
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    Copy-Item $it.FullName -Destination $dest -Force
  }
}

Compress-Archive -Path (Join-Path $temp '*') -DestinationPath $Out -Force

Write-Host "ZIP created: $Out"
