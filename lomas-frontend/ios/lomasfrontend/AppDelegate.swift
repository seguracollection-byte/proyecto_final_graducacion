import Expo
import React
import ReactAppDependencyProvider

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?
  var initialLaunchOptions: [UIApplication.LaunchOptionsKey: Any]?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

    initialLaunchOptions = launchOptions


    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    let provider = RCTBundleURLProvider.sharedSettings()
    // Local development only; update this plist value if the Mac's IP changes.
    if let host = Bundle.main.object(forInfoDictionaryKey: "LomasMetroHost") as? String {
      provider.jsLocation = host
    }
    return provider.jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

// iOS 27 requires the window to belong to a UIWindowScene.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else { return }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    var options = appDelegate.initialLaunchOptions ?? [:]
    if let context = connectionOptions.urlContexts.first {
      options[.url] = context.url
      options[.sourceApplication] = context.options.sourceApplication
      options[.annotation] = context.options.annotation
    }
    if let activity = connectionOptions.userActivities.first {
      options[.userActivityDictionary] = [
        "UIApplicationLaunchOptionsUserActivityKey": activity
      ]
    }

    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: options)
    window.makeKeyAndVisible()

    for context in connectionOptions.urlContexts {
      deliver(context)
    }
    for activity in connectionOptions.userActivities {
      self.scene(scene, continue: activity)
    }
  }

  private func deliver(_ context: UIOpenURLContext) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    options[.sourceApplication] = context.options.sourceApplication
    options[.annotation] = context.options.annotation
    options[.openInPlace] = context.options.openInPlace
    _ = appDelegate.application(UIApplication.shared, open: context.url, options: options)
  }

  func scene(_ scene: UIScene, openURLContexts contexts: Set<UIOpenURLContext>) {
    for context in contexts { deliver(context) }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    _ = appDelegate.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in })
  }
}
