# Active RFC: Fix macOS Application Icon (Specra 'S' Monogram)

## Problem Summary
When `Specra.app` is installed on macOS, the application icon in Launchpad, Dock, and Finder displays the default Wails "W" icon instead of the Specra "S" monogram squircle icon.

## Root Cause
On macOS 11+ (Big Sur through Sequoia), macOS prioritizes **`Assets.car`** (Apple Asset Catalog) over `icons.icns` if `CFBundleIconName: appicon` is present in `Info.plist`. The repository contained an obsolete static `build/darwin/Assets.car` (1.6 MB) with the default Wails "W" logo that was copied into `Specra.app/Contents/Resources/Assets.car`.

## Technical Fix
1. Remove `CFBundleIconName: appicon` from `build/darwin/Info.plist` and `build/darwin/Info.dev.plist`.
2. Delete obsolete `build/darwin/Assets.car`.
3. Update `build/darwin/Taskfile.yml` to remove the `Assets.car` copy task.
4. Generate an Apple-native multi-resolution `build/darwin/icons.icns` and `build/darwin/dmg-file-icon.icns` using `iconutil` from `build/appicon.svg`.
5. Re-package `bin/specra.dmg` and verify.
