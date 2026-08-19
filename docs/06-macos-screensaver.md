# 06: Native macOS Screen Saver Packaging

This chapter covers compiling the web project into a standalone macOS `.saver` bundle using native system tools.

## The `.saver` Bundle Structure

On macOS, screensavers are bundles structured as follows:

```
Genscape.saver/
└── Contents/
    ├── Info.plist
    ├── MacOS/
    │   └── Genscape (compiled Mach-O 64-bit bundle binary)
    └── Resources/
        └── index.html (and compiled Vite assets)
```

## The Native Objective-C Wrapper (`native/GenscapeView.m`)

We write a lightweight Objective-C class inheriting from `ScreenSaverView` that instantiates a `WKWebView`.

```objc
#import <ScreenSaver/ScreenSaver.h>
#import <WebKit/WebKit.h>

@interface GenscapeView : ScreenSaverView
@property (nonatomic, strong) WKWebView *webView;
@end

@implementation GenscapeView

- (instancetype)initWithFrame:(NSRect)frame isPreview:(BOOL)isPreview {
    self = [super initWithFrame:frame isPreview:isPreview];
    if (self) {
        WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];
        
        // Grant local file loading permissions
        [config.preferences setValue:@YES forKey:@"allowFileAccessFromFileURLs"];
        [config setValue:@YES forKey:@"allowUniversalAccessFromFileURLs"];
        
        self.webView = [[WKWebView alloc] initWithFrame:self.bounds configuration:config];
        self.webView.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
        
        [self addSubview:self.webView];
        
        // Locate index.html inside the bundle Resources directory
        NSBundle *bundle = [NSBundle bundleForClass:[self class]];
        NSURL *resourcesURL = [bundle resourceURL];
        NSURL *htmlURL = [resourcesURL URLByAppendingPathComponent:@"index.html"];
        
        if ([[NSFileManager defaultManager] fileExistsAtPath:htmlURL.path]) {
            [self.webView loadFileURL:htmlURL allowingReadAccessToURL:resourcesURL];
        }
    }
    return self;
}

- (BOOL)hasConfigureSheet { return NO; }
- (NSWindow *)configureSheet { return nil; }

@end
```

`loadFileURL:allowingReadAccessToURL:` grants WebKit permission to read assets inside the bundle's `Resources/` directory.

## Build Automation (`scripts/build-saver.sh`)

The shell script builds Vite production assets, generates `Info.plist`, compiles the binary with `clang`, strips extended attributes, and applies an ad-hoc code signature.

```bash
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

rm -rf "$SAVER_DIR"
mkdir -p "$MACOS_DIR" "$RESOURCES_DIR"

cp -R dist/* "$RESOURCES_DIR/"

cat << 'EOF' > "$CONTENTS_DIR/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key><string>Genscape</string>
    <key>CFBundleIdentifier</key><string>com.williamthazard.visualinterest.saver</string>
    <key>CFBundleName</key><string>Genscape</string>
    <key>CFBundlePackageType</key><string>BNDL</string>
    <key>NSPrincipalClass</key><string>GenscapeView</string>
</dict>
</plist>
EOF

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

xattr -rc "$SAVER_DIR"
codesign -f -s - "$SAVER_DIR"

echo "✨ Successfully built $SAVER_DIR"
```

Running `npm run install:saver` executes this script and installs `Genscape.saver` directly into macOS System Settings.
