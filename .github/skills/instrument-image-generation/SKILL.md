---
name: instrument-image-generation
description: Generate or replace this game's instrument illustrations locally with FLUX.2 Klein, keeping image dimensions and tile backgrounds consistent.
---

# Instrument Image Generation

Use this skill when generating, replacing, or adding instrument artwork for this game.

## Setup

The generator uses FLUX.2 Klein 4B through Diffusers and a CUDA-enabled NVIDIA GPU. The model needs roughly 13 GB of VRAM and downloads about 14 GB of weights on its first run. The weights are cached outside the repository.

On Windows PowerShell, create the ignored local environment once:

```powershell
& (Join-Path $PWD 'scripts/setup-imagegen.ps1')
```

## Generate

Generate the full instrument set:

```powershell
node scripts/generate-instruments.mjs
```

Regenerate only selected instruments by using names from `INSTRUMENTS` in `scripts/generate-instruments.py`:

```powershell
node scripts/generate-instruments.mjs --only flute xylophone
```

The generator writes 1024x1024 PNGs to `assets/symbols/`, normalizes the edge-connected background to the tile color `#FFFDF6`, and only replaces selected assets after generation succeeds.

## Add An Instrument

Add its asset basename and a specific visual description to `INSTRUMENTS` in `scripts/generate-instruments.py`. Describe real construction, proportions, materials, playing orientation, and distinguishing details. Avoid generic toy or cartoon prompts when instrument accuracy matters.

Generate the new name with `--only`, inspect the result at tile size, and verify its dimensions and background. To make it playable, separately add its image and audio `require()` entries to `App.js` and provide the corresponding sound asset.