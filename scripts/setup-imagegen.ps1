$ErrorActionPreference = 'Stop'

$projectDirectory = Split-Path -Parent $PSScriptRoot
$environmentDirectory = Join-Path $projectDirectory '.venv-imagegen'
$python = Join-Path $environmentDirectory 'Scripts\python.exe'

if (-not (Test-Path $python)) {
    python -m venv $environmentDirectory
    if ($LASTEXITCODE -ne 0) { throw 'Could not create the image-generation environment.' }
}

& $python -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) { throw 'Could not upgrade pip.' }

& $python -m pip install torch --index-url https://download.pytorch.org/whl/cu128
if ($LASTEXITCODE -ne 0) { throw 'Could not install CUDA-enabled PyTorch.' }

& $python -m pip install git+https://github.com/huggingface/diffusers.git transformers accelerate sentencepiece protobuf pillow
if ($LASTEXITCODE -ne 0) { throw 'Could not install Diffusers and model dependencies.' }

& $python -c "import torch; print(f'PyTorch {torch.__version__}; CUDA available: {torch.cuda.is_available()}'); print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'No CUDA device found')"
if ($LASTEXITCODE -ne 0) { throw 'Could not verify the image-generation environment.' }