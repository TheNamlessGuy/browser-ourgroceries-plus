const Communication = {
  actions: {
    'get-opts': async function() { return await Opts.get(); },
    'toggle-category-safeness': async function(msg) { await Opts.category.toggleSafeness(msg.category); },
    'mark-category-as-safe': async function(msg) { await Opts.category.markAsSafe(msg.category); },
    'unmark-category-as-safe': async function(msg) { await Opts.category.unmarkAsSafe(msg.category); },
  },

  /**
   * @returns {Promise<void>}
   */
  init: async function() {
    if (!browser.runtime.onConnect.hasListener(Communication._onConnect)) {
      browser.runtime.onConnect.addListener(Communication._onConnect);
    }
  },

  /**
   * @param {BrowserPort} port
   * @returns {Promise<void>}
   */
  _onConnect: async function(port) {
    port.onMessage.addListener(async (msg) => {
      let data = null;
      if (msg.action in Communication.actions) {
        data = await Communication.actions[msg.action](msg);
      }

      port.postMessage({action: msg.action, data: data});
    });
  },
};