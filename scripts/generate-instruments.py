import argparse
import os
import tempfile
from pathlib import Path

import numpy as np
import torch
from diffusers import Flux2KleinPipeline
from PIL import Image, ImageDraw


PROJECT_DIRECTORY = Path(__file__).resolve().parent.parent
OUTPUT_DIRECTORY = PROJECT_DIRECTORY / "assets" / "symbols"
MODEL_ID = "black-forest-labs/FLUX.2-klein-4B"

INSTRUMENTS = [
    ("piano", "A compact glossy upright piano with black and white keys and three pedals."),
    ("electric_guitar", "A classic solid-body electric guitar with six strings, pickups, and a bold red body."),
    ("nylon_guitar", "A natural-wood classical guitar with a round sound hole, nylon strings, and a wide slotted headstock."),
    ("flute", "A professional silver C-foot concert flute in its normal horizontal playing position, headjoint and embouchure hole on the left, long cylindrical body with accurate open-hole keys, key cups and rods, and a gently curved foot joint on the right. Clearly a transverse flute, not a recorder."),
    ("recorder", "A realistic wooden alto recorder in its normal vertical playing position, dark natural wood, straight gently tapered one-piece body, distinct beak-shaped whistle mouthpiece with a small windway and labium, seven correctly spaced front finger holes and a discreet thumb hole at the back, simple foot flare. No metal keys."),
    ("tenor_sax", "A golden tenor saxophone with a curved neck, visible keys, and a flared bell."),
    ("trumpet", "A professional Bb trumpet in its normal horizontal playing position, polished brass tubing, small cup mouthpiece at the left, leadpipe, exactly three vertical piston valves in one row with three round buttons and finger hooks, recognizable tuning slides, and one large flared bell opening to the right. Correct compact trumpet geometry, not a bugle or toy."),
    ("violin", "A polished reddish-brown violin with four strings, a black fingerboard, and a chin rest."),
    ("drums", "A compact red drum kit with a bass drum, snare, two toms, and one cymbal."),
    ("xylophone", "A full-size professional orchestral xylophone, clearly a real concert percussion instrument and not a children's toy. Show the complete horizontal keyboard on a sturdy black metal wheeled stand: two staggered chromatic rows of graduated dark reddish-brown rosewood bars, lower bars broad and longer, higher bars progressively narrower and shorter, natural wood grain, thin black cords supporting each bar, and a visible row of metal resonator tubes suspended below the bars. Include two slim wooden xylophone mallets resting neatly along the frame. No rainbow colors, no toy frame, no oversized cartoon details."),
]

STYLE = (
    "Create one polished, accurate 3D product illustration of the specified real musical instrument. "
    "Use authentic instrument construction, realistic proportions and materials, recognizable functional details, "
    "a consistent three-quarter product view, and soft studio lighting. Do not make it a toy or cartoon. "
    "Show the complete instrument centered in its normal playing orientation, large and fully visible with clear margins. "
    "The canvas must be square, exactly 1024 by 1024 pixels. Fill the entire background with a perfectly "
    "flat, uniform, opaque #FFFDF6 color matching the tile. No gradient, texture, vignette, cast shadow "
    "on the background, frame, text, letters, logos, or extra objects. Instrument: "
)

BACKGROUND_COLOR = (255, 253, 246)
BACKGROUND_SENTINEL = (1, 0, 1)


def normalize_background(image):
    image = image.convert("RGB")
    for position in range(0, 1024, 16):
        for seed in ((position, 0), (position, 1023), (0, position), (1023, position)):
            if image.getpixel(seed) != BACKGROUND_SENTINEL:
                ImageDraw.floodfill(image, seed, BACKGROUND_SENTINEL, thresh=40)

    pixels = np.asarray(image).copy()
    background_mask = np.all(pixels == BACKGROUND_SENTINEL, axis=2)
    pixels[background_mask] = BACKGROUND_COLOR
    return Image.fromarray(pixels)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", nargs="+", choices=[name for name, _ in INSTRUMENTS])
    selected_names = set(parser.parse_args().only or [])
    selected_instruments = [
        (name, description)
        for name, description in INSTRUMENTS
        if not selected_names or name in selected_names
    ]

    if not torch.cuda.is_available():
        raise RuntimeError("CUDA is unavailable. Install a CUDA-enabled PyTorch build before generating art.")

    free_bytes, total_bytes = torch.cuda.mem_get_info()
    print(
        f"Using {torch.cuda.get_device_name(0)}; "
        f"{free_bytes / 1024**3:.1f} of {total_bytes / 1024**3:.1f} GiB VRAM currently free."
    )
    print(f"Loading {MODEL_ID}; first run downloads model weights to the Hugging Face cache.")

    pipeline = Flux2KleinPipeline.from_pretrained(
        MODEL_ID,
        torch_dtype=torch.bfloat16,
    )
    pipeline.enable_model_cpu_offload()
    OUTPUT_DIRECTORY.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix=".generated-", dir=OUTPUT_DIRECTORY) as staging:
        staging_directory = Path(staging)
        for seed, (name, description) in enumerate(INSTRUMENTS, start=1):
            if selected_names and name not in selected_names:
                continue
            image = pipeline(
                prompt=STYLE + description,
                height=1024,
                width=1024,
                guidance_scale=1.0,
                num_inference_steps=4,
                generator=torch.Generator(device="cuda").manual_seed(seed),
            ).images[0]
            if image.size != (1024, 1024):
                raise RuntimeError(f"{name}: expected 1024x1024, received {image.size}.")
            normalize_background(image).save(staging_directory / f"{name}.png", format="PNG")
            print(f"Generated {name}.png")

        for name, _ in selected_instruments:
            os.replace(
                staging_directory / f"{name}.png",
                OUTPUT_DIRECTORY / f"{name}.png",
            )

    print(f"Replaced {len(selected_instruments)} images in {OUTPUT_DIRECTORY}.")


if __name__ == "__main__":
    main()