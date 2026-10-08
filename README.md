# toms-first-game

A landscape Expo game that asks Tom to find the instrument he hears. Instrument sounds are bundled as offline WAV files.

## Run

```sh
npm install
npx expo start
```

Press `a` in the Expo terminal to open Android, or scan the QR code with Expo Go. For a native Android build, use `npx expo run:android` after installing Android Studio and its SDK.

## Install on an Android phone

An installable APK can be built with Expo Application Services (EAS):

1. Create or sign in to an Expo account with `npx eas-cli login`.
2. Run `npm run build:android:apk`. On the first build, follow the prompts to create or link the EAS project.
3. When the build finishes, open its EAS link on the phone, download the APK, and install it. Android may ask you to allow installs from the browser or file manager used to open the APK.

Set `TOTAL_OPTIONS` in `App.js` to `2`, `3`, or `4` to change the number of choices.