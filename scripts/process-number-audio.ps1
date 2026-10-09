param(
  [string]$FfmpegPath = 'ffmpeg'
)

$ErrorActionPreference = 'Stop'

if ((Split-Path $FfmpegPath -Parent) -eq '') {
  $ffmpegCommand = Get-Command $FfmpegPath -ErrorAction SilentlyContinue
  if (-not $ffmpegCommand) {
    throw "FFmpeg executable '$FfmpegPath' was not found."
  }
  $FfmpegPath = $ffmpegCommand.Source
} elseif (-not (Test-Path -LiteralPath $FfmpegPath -PathType Leaf)) {
  throw "FFmpeg executable '$FfmpegPath' does not exist."
}

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$sourceDirectory = Join-Path $repositoryRoot 'assets/sounds/numbers'
$outputDirectory = Join-Path $sourceDirectory 'processed'
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null

$filter = 'adeclick,agate=threshold=0.012:ratio=4:attack=4:release=160:range=0.06,loudnorm=I=-20:TP=-2:LRA=7'
Get-ChildItem -LiteralPath $sourceDirectory -Filter '*.m4a' -File | ForEach-Object {
  $outputPath = Join-Path $outputDirectory "$($_.BaseName).wav"
  & $FfmpegPath -hide_banner -loglevel error -y -i $_.FullName -af $filter -ac 1 -ar 44100 -c:a pcm_s16le $outputPath
  if ($LASTEXITCODE -ne 0) {
    throw "FFmpeg failed to process '$($_.Name)'."
  }
  Write-Output $outputPath
}