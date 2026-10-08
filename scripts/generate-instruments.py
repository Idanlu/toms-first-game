import argparse
import os
import tempfile
from pathlib import Path

import numpy as np
import torch
from diffusers import Flux2KleinPipeline
from PIL import Image, ImageDraw, ImageOps


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
    ("accordion", "A full-size piano accordion shown upright at a three-quarter angle, with a deep red lacquered treble casing, a vertical row of clearly visible black and white piano keys on the right side, a black pleated bellows expanded at the center with parallel ribs, and a bass casing on the left with several orderly rows of small round bass buttons. Include realistic metal bellows corners, a perforated grille, and shoulder straps. Correct proportions and playing orientation; no toy styling."),
    ("cello", "A full-size cello standing vertically, with a rich amber-brown carved maple and spruce body, two clearly shaped f-holes, a black fingerboard, four strings, bridge, tailpiece, curved neck with scroll, and a metal endpin. Accurate concert cello proportions and polished wood grain; no bow or extra instruments."),
    ("clarinet", "A professional black grenadilla B-flat clarinet standing vertically, with a cylindrical body, silver-plated keywork and rings, a distinct mouthpiece with reed and ligature at the top, and a flared bell at the bottom. Show its realistic barrel, upper and lower joints, and detailed key rods. It must read clearly as a clarinet, not an oboe or recorder."),
    ("darbuka", "A real Egyptian darbuka goblet drum matching the supplied reference: tall, broad bowl-shaped upper body, sharply narrowing waist, and small flared foot, with a circular decorated blue drumhead and dark textured hammered-metal shell. Keep its unmistakable goblet-drum silhouette and proportions from the reference. One drum only; no vase shape, extra bowls, stand, or added ornament beyond the reference."),
    ("double_bass", "A full-size orchestral double bass standing upright on its endpin, with a very large amber-brown carved wooden body, two f-holes, bridge, tailpiece, four thick strings, long black fingerboard and neck, and a carved scroll with tuning machines. Show accurate tall proportions and polished wood grain, fully in frame; no bow or extra instruments."),
    ("harmonica", "A real slim pocket harmonica matching the supplied reference: short horizontal chrome cover plates over a narrow warm wood comb, with one clear straight row of ten small rectangular mouth holes along its long edge. Preserve the reference's compact proportions, silver top, golden wood body, and visible holes. It is a harmonica, not a keyboard, piano, melodica, xylophone, or wooden box; no hands or case."),
    ("harp", "A full-size concert pedal harp standing upright, with a tall curved gilded neck, triangular column and base, large resonant soundboard, many taut parallel strings graduating from short to long, and visible pedals at the base. Use elegant carved gold and warm wood detailing with accurate concert harp construction; fully in frame, not a lyre."),
    ("maracas", "A matching pair of traditional maracas, each with a naturally textured dried gourd shaker head securely mounted on a smooth wooden handle. Show both separate instruments side by side at a slight angle, in realistic natural cream and warm brown tones. Clearly identifiable as acoustic hand percussion, not plastic toy rattles."),
    ("triangle", "A clean product illustration of one silver musical triangle frame. The frame consists of exactly three thin, straight steel rods: two long sides meeting at the top, and one short horizontal bottom side. Leave a wide, obvious gap between the bottom side's right end and the right sloping side, so the outline is visibly open at the lower-right corner. Show only these three rods and one fine suspension thread rising vertically from the top vertex; the interior is empty. Do not include any other loose rod or extra line."),
]

REFERENCE_IMAGE_EXCLUSIONS = {"triangle"}

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
    instrument_names = [name for name, _ in INSTRUMENTS]
    if len(instrument_names) != len(set(instrument_names)):
        raise ValueError("INSTRUMENTS contains duplicate asset basenames.")

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
            reference_path = OUTPUT_DIRECTORY / f"{name}.jpg"
            reference_image = None
            if reference_path.is_file() and name not in REFERENCE_IMAGE_EXCLUSIONS:
                with Image.open(reference_path) as reference:
                    reference_image = ImageOps.pad(
                        reference.convert("RGB"),
                        (1024, 1024),
                        color=BACKGROUND_COLOR,
                    )
            prompt = STYLE + description
            if reference_image is not None:
                prompt += " Faithfully preserve the reference image's instrument identity, silhouette, proportions, and visible construction details."
            image = pipeline(
                prompt=prompt,
                image=reference_image,
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