---
name: add-instrument
description: Add a playable instrument to Tom's First Game by generating its illustration, sourcing a real licensed solo recording, and registering both assets in the app.
---

# Add An Instrument

Use this workflow when asked to add a new playable instrument. A complete addition includes a generated image, a real recorded solo with rights that permit use in the game, and an `INSTRUMENTS` catalogue entry in `App.js`.

## Gather The Instrument Identity

Confirm the instrument's display label, stable kebab-case ID, and snake_case asset basename. Check that neither the ID nor either asset path already exists. Write down its characteristic appearance and sound so the image and recording clearly represent the same instrument.

## Generate The Illustration

Follow `.github/skills/instrument-image-generation/SKILL.md` to create the image with the local FLUX.2 Klein generator. Add the new basename and an instrument-specific visual prompt to `INSTRUMENTS` in `scripts/generate-instruments.py`; then generate only that name. Keep the established 1024x1024 size, realistic instrument construction, clear silhouette, and exact `#FFFDF6` background. Review the result at the tile's rendered size.

Save the final PNG as `assets/symbols/<basename>.png`.

## Source A Real Solo

Do not synthesize or AI-generate the instrument recording. Find a real performance recording or arrange to record the instrument directly. The clip should feature only the requested instrument, be approximately 6 to 12 seconds, have no vocals or accompaniment, and make the instrument's characteristic tone easy to recognize.

Before using a recording, verify its license explicitly permits redistribution in this game and meet any attribution requirements. Do not use clips with unclear provenance, sample-pack terms that forbid redistribution, or ambiguous licenses. Record the source and license/attribution in the change description or project credits. Trim a clean short solo, then convert it to 24 kHz stereo, 16-bit PCM WAV to match the existing game sounds; duplicate a mono channel to make stereo if needed. Save it as `assets/sounds/<basename>.wav`.

## Register And Verify

Only after both the image and licensed recording exist, add one static catalogue entry in `App.js` using the existing pattern:

```js
{ id: '<kebab-case-id>', label: '<Display label>', image: require('./assets/symbols/<basename>.png'), sound: require('./assets/sounds/<basename>.wav') },
```

Add the image prompt to the image generator's `INSTRUMENTS` list so it can be regenerated later. Verify both referenced files exist, the image is 1024x1024 with the exact tile background, and the WAV is 24 kHz stereo PCM 16-bit. Listen to the WAV and confirm it is a short, recognizable solo of the real instrument. Run an Expo export or equivalent bundle check to catch invalid static `require()` paths.

Do not replace or modify existing instrument assets as part of adding a new one. Keep generated model weights and temporary renders outside the repository; only the final PNG/WAV and necessary source changes belong in the game.