$ErrorActionPreference = 'Stop'

# This installer downloads only the CrispASR Windows runtime into this Zixel Chords folder.
# The chord-model licence is accepted separately in the web app before its first use.
$appRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$engineRoot = Join-Path $appRoot '.engine'
$engineFolder = Join-Path $engineRoot 'crispasr'
$engineExe = Join-Path $engineFolder 'crispasr.exe'
$createdEngineFolder = $false

if (Test-Path -LiteralPath $engineExe) {
  Write-Host ''
  Write-Host 'Zixel Chords Local AI engine is already installed.' -ForegroundColor Green
  Write-Host 'Open start-zixelchords.cmd and refresh http://127.0.0.1:4173/'
  exit 0
}

if (Test-Path -LiteralPath $engineFolder) {
  throw "An incomplete .engine\crispasr folder exists. Delete only that folder, then run this installer again."
}

$stageFolder = Join-Path $engineRoot ('download-' + [guid]::NewGuid().ToString('N'))
$zipPath = Join-Path $engineRoot 'crispasr-runtime.zip'

try {
  New-Item -ItemType Directory -Path $stageFolder -Force | Out-Null
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $headers = @{ 'User-Agent' = 'ChordTube-Local-Installer' }
  Write-Host ''
  Write-Host 'Looking for the current Windows AI runtime...' -ForegroundColor Cyan
  $release = Invoke-RestMethod -Uri 'https://api.github.com/repos/CrispStrobe/CrispASR/releases/latest' -Headers $headers
  $asset = @($release.assets | Where-Object { $_.name -match '(?i)windows.*(x86_64|x64).*vulkan.*\.zip$' }) | Select-Object -First 1
  if ($null -eq $asset) {
    $asset = @($release.assets | Where-Object {
      $_.name -match '(?i)windows.*(x86_64|x64).*\.zip$' -or $_.name -match '(?i)(x86_64|x64).*windows.*\.zip$'
    }) | Select-Object -First 1
  }

  if ($null -eq $asset) {
    throw 'No CrispASR Windows x64 package was found in the latest release.'
  }

  Write-Host ('Downloading ' + $asset.name + ' ...') -ForegroundColor Cyan
  Invoke-WebRequest -Uri $asset.browser_download_url -Headers $headers -OutFile $zipPath -UseBasicParsing
  Write-Host 'Unpacking the runtime...' -ForegroundColor Cyan
  Expand-Archive -LiteralPath $zipPath -DestinationPath $stageFolder -Force

  $foundExe = Get-ChildItem -LiteralPath $stageFolder -Filter 'crispasr.exe' -File -Recurse | Select-Object -First 1
  if ($null -eq $foundExe) {
    throw 'The downloaded package does not contain crispasr.exe.'
  }

  New-Item -ItemType Directory -Path $engineFolder -Force | Out-Null
  $createdEngineFolder = $true
  Get-ChildItem -LiteralPath $foundExe.Directory.FullName -Force | Copy-Item -Destination $engineFolder -Recurse -Force
  if (-not (Test-Path -LiteralPath $engineExe)) {
    throw 'The AI runtime could not be placed correctly.'
  }

  $metadata = [ordered]@{
    runtime = 'CrispASR'
    release = $release.tag_name
    installedAt = (Get-Date).ToString('o')
  } | ConvertTo-Json
  Set-Content -LiteralPath (Join-Path $engineRoot 'engine-version.json') -Value $metadata -Encoding UTF8

  Write-Host ''
  Write-Host 'AI engine is installed.' -ForegroundColor Green
  Write-Host 'Next: run start-zixelchords.cmd, refresh the page, and upload an MP3 you have rights to use.'
}
catch {
  Write-Host ''
  Write-Host ('Installation did not finish: ' + $_.Exception.Message) -ForegroundColor Red
  Write-Host 'Your Zixel Chords files were not changed outside the .engine folder.'
  exit 1
}
finally {
  if ($createdEngineFolder -and -not (Test-Path -LiteralPath $engineExe) -and (Test-Path -LiteralPath $engineFolder)) {
    Remove-Item -LiteralPath $engineFolder -Recurse -Force
  }
  if (Test-Path -LiteralPath $stageFolder) { Remove-Item -LiteralPath $stageFolder -Recurse -Force }
  if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
}
