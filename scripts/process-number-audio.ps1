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
$sourceFiles = @(Get-ChildItem -LiteralPath $sourceDirectory -Filter '*.m4a' -File)
if ($sourceFiles.Count -eq 0) {
  throw "No M4A source recordings found in '$sourceDirectory'."
}

$nameMap = @{
  'אפס' = 'hebrew_0'
  'אחת' = 'hebrew_1'
  'שתיים' = 'hebrew_2'
  'שלוש' = 'hebrew_3'
  'ארבע' = 'hebrew_4'
  'חמש' = 'hebrew_5'
  'שש' = 'hebrew_6'
  'שבע' = 'hebrew_7'
  'שמונה' = 'hebrew_8'
  'תשע' = 'hebrew_9'
  'ноль' = 'russian_0'
  'один' = 'russian_1'
  'два' = 'russian_2'
  'три' = 'russian_3'
  'четыре' = 'russian_4'
  'пять' = 'russian_5'
  'шесть' = 'russian_6'
  'семь' = 'russian_7'
  'восемь' = 'russian_8'
  'девять' = 'russian_9'
}

$filter = 'adeclick,agate=threshold=0.012:ratio=4:attack=4:release=160:range=0.06,loudnorm=I=-20:TP=-2:LRA=7'
$sourceFiles | ForEach-Object {
  $targetBaseName = if ($nameMap.ContainsKey($_.BaseName)) { $nameMap[$_.BaseName] } else { $_.BaseName }
  $outputPath = Join-Path $sourceDirectory "$targetBaseName.wav"
  & $FfmpegPath -hide_banner -loglevel error -y -i $_.FullName -af $filter -ac 1 -ar 44100 -c:a pcm_s16le $outputPath
  if ($LASTEXITCODE -ne 0) {
    throw "FFmpeg failed to process '$($_.Name)'."
  }
  Write-Output $outputPath
}