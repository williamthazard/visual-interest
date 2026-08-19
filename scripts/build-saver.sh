#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"

echo "==> Building web assets..."
npm run build

SAVER_DIR="$ROOT_DIR/Genscape.saver"
CONTENTS_DIR="$SAVER_DIR/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"
RESOURCES_DIR="$CONTENTS_DIR/Resources"

echo "==> Creating bundle structure..."
rm -rf "$SAVER_DIR"
mkdir -p "$MACOS_DIR" "$RESOURCES_DIR"

echo "==> Copying web assets to bundle resources..."
cp -R dist/* "$RESOURCES_DIR/"

echo "==> Creating Info.plist..."
cat << 'EOF' > "$CONTENTS_DIR/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleExecutable</key>
    <string>Genscape</string>
    <key>CFBundleIdentifier</key>
    <string>com.williamthazard.genscape.saver</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>Genscape</string>
    <key>CFBundlePackageType</key>
    <string>BNDL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleSignature</key>
    <string>????</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>NSPrincipalClass</key>
    <string>GenscapeView</string>
</dict>
</plist>
EOF

echo "==> Compiling native ScreenSaverView binary..."
SDK_PATH="$(xcrun --show-sdk-path)"
ARCH="$(uname -m)"

clang -fobjc-arc -bundle \
  -isysroot "$SDK_PATH" \
  -arch "$ARCH" \
  -framework ScreenSaver \
  -framework WebKit \
  -framework AppKit \
  native/GenscapeView.m \
  -o "$MACOS_DIR/Genscape"

echo "==> Cleaning extended attributes and signing bundle (ad-hoc)..."
xattr -rc "$SAVER_DIR"
codesign -f -s - "$SAVER_DIR"

echo ""
echo "✨ Success! Created $SAVER_DIR"
echo ""
echo "To install for your Mac:"
echo "  open Genscape.saver"
echo "  # or manually copy to your Screen Savers directory:"
echo "  cp -R Genscape.saver ~/Library/Screen\\ Savers/"
