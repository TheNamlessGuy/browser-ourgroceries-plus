const Background = {
  _onBrowserActionClicked: async function(tab, info) {
    browser.browserAction.setPopup({tabId: tab.id, popup: '/src/popup/browser-action/index.html'});
    browser.browserAction.openPopup();
    browser.browserAction.setPopup({tabId: tab.id, popup: ''});
  },

  main: async function() {
    await Opts.init();
    await Communication.init();

    if (!browser.browserAction.onClicked.hasListener(Background._onBrowserActionClicked)) {
      browser.browserAction.onClicked.addListener(Background._onBrowserActionClicked);
    }
  },
};

Background.main();