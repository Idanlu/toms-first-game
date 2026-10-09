# toms-first-game

A landscape Expo game with instrument-listening and number-listening games. Number audio currently supports Hebrew and Russian, with one language used for each round.

The game uses click-reduced, level-matched WAV recordings in `assets/sounds/numbers`; the original M4A sources are not included. To regenerate the WAVs, provide the M4A sources in that directory, install FFmpeg, and run `pwsh -File scripts/process-number-audio.ps1`.

## Run

```sh
npm install
npx expo start
```

Press `a` in the Expo terminal to open Android, or scan the QR code with Expo Go. For a native Android build, use `npx expo run:android` after installing Android Studio and its SDK.

## Install on an Android phone

### Option 1: GitHub Actions (Automated Release APK)

Push a version tag to GitHub to automatically build and publish a release APK:

```sh
git tag v1.0.0
git push origin v1.0.0
```

You can also trigger builds manually in GitHub under the **Actions** tab by choosing **Build and Publish Release APK** and clicking **Run workflow**.

Once complete:
- The APK will be attached as a downloadable asset on the **Releases** page (`toms-first-game-v1.0.0.apk`).
- It is also available as a build artifact in the workflow run summary.

### Option 2: Expo Application Services (EAS)

An installable APK can also be built with Expo Application Services (EAS):

1. Create or sign in to an Expo account with `npx eas-cli login`.
2. Run `npm run build:android:apk`. On the first build, follow the prompts to create or link the EAS project.
3. When the build finishes, open its EAS link on the phone, download the APK, and install it. Android may ask you to allow installs from the browser or file manager used to open the APK.

Set `TOTAL_OPTIONS` in `App.js` to `2`, `3`, or `4` to change the number of choices.