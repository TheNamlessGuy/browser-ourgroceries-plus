/** Options
 * @typedef {object} Options
 * @property {OptionsCategories} categories
 */

/** OptionsCategories
 * @typedef {object} OptionsCategories
 * @property {string[]} safe
 */

const Opts = {
  /**
   * @returns {Promise<void>}
   */
  init: async function() {
    const _default = {
      categories: {
        safe: [],
      },
    };

    const opts = await Opts.get();
    if (Object.keys(opts).length === 0) {
      await Opts._set(_default);
    }
  },

  /**
   * @returns {Promise<Options>}
   */
  get: async function() {
    return await browser.storage.sync.get();
  },

  /**
   * @param {Options} opts
   * @returns {Promise<void>}
   */
  _set: async function(opts) {
    await browser.storage.sync.set(opts);
  },

  category: {
    /**
     * @param {string} category
     * @returns {Promise<boolean>}
     */
    isMarkedAsSafe: async function(category) {
      const opts = await Opts.get();
      return opts.categories.safe.includes(category);
    },

    /**
     * @param {string} category
     * @returns {Promise<void>}
     */
    markAsSafe: async function(category) {
      if (category == null) { return; }

      const opts = await Opts.get();
      if (!opts.categories.safe.includes(category)) {
        opts.categories.safe.push(category);
      }

      await Opts._set(opts);
    },

    /**
     * @param {string} category
     * @returns {Promise<void>}
     */
    unmarkAsSafe: async function(category) {
      if (category == null) { return; }

      const opts = await Opts.get();
      opts.categories.safe = opts.categories.safe.filter(x => x !== category);
      await Opts._set(opts);
    },

    /**
     * @param {string} category
     * @returns {Promise<void>}
     */
    toggleSafeness: async function(category) {
      if (category == null) { return; }

      const opts = await Opts.get();
      if (opts.categories.safe.includes(category)) {
        opts.categories.safe = opts.categories.safe.filter(x => x !== category);
      } else {
        opts.categories.safe.push(category);
      }
      await Opts._set(opts);
    },
  },
};