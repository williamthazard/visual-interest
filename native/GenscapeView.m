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
        
        // Allow local file loading in WKWebView
        [config.preferences setValue:@YES forKey:@"allowFileAccessFromFileURLs"];
        [config setValue:@YES forKey:@"allowUniversalAccessFromFileURLs"];
        
        self.webView = [[WKWebView alloc] initWithFrame:self.bounds configuration:config];
        self.webView.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
        
        [self addSubview:self.webView];
        
        // Locate index.html inside the .saver bundle's Resources directory
        NSBundle *bundle = [NSBundle bundleForClass:[self class]];
        NSURL *resourcesURL = [bundle resourceURL];
        NSURL *htmlURL = [resourcesURL URLByAppendingPathComponent:@"index.html"];
        
        if ([[NSFileManager defaultManager] fileExistsAtPath:htmlURL.path]) {
            [self.webView loadFileURL:htmlURL allowingReadAccessToURL:resourcesURL];
        }
    }
    return self;
}

- (void)startAnimation {
    [super startAnimation];
}

- (void)stopAnimation {
    [super stopAnimation];
}

- (void)drawRect:(NSRect)rect {
    [super drawRect:rect];
}

- (BOOL)hasConfigureSheet {
    return NO;
}

- (NSWindow *)configureSheet {
    return nil;
}

@end
