const Communication = {
  _port: null,

  /**
   * @returns {Promise<void>}
   */
  init: async function() {
    Communication._port = browser.runtime.connect();
  },

  /**
   * @param {string} action
   * @param {Record<string, *>} extras
   * @returns {Promise<*>}
   */
  _send: function(action, extras = {}) {
    return new Promise((resolve) => {
      /**
       * @param {{action: string, data: *}} msg
       * @returns {void}
       */
      const listener = (msg) => {
        if (msg.action === action) {
          Communication._port.onMessage.removeListener(listener);
          resolve(msg.data);
        }
      };
      Communication._port.onMessage.addListener(listener);

      Communication._port.postMessage({action, ...extras});
    });
  },

  actions: {
    /**
     * @returns {Promise<Options>}
     */
    getOpts: async function() {
      return await Communication._send('get-opts');
    },

    /**
     * @param {string} category
     * @returns {Promise<void>}
     */
    markCategoryAsSafe: async function(category) {
      await Communication._send('mark-category-as-safe', {category});
    },

    /**
     * @param {string} category
     * @returns {Promise<void>}
     */
    unmarkCategoryAsSafe: async function(category) {
      await Communication._send('unmark-category-as-safe', {category});
    },
  },
};

async function populateSafedCategoriesList() {
  const opts = await Communication.actions.getOpts();

  if (opts.categories.safe.length === 0) {
    document.getElementById('safe-category-list-empty').style.display = null;
    document.getElementById('safe-category-list').style.display = 'none';
    return;
  }

  document.getElementById('safe-category-list-empty').style.display = 'none';
  const list = document.getElementById('safe-category-list');
  list.style.display = null;
  Array.from(list.getElementsByClassName('category')).forEach(x => x.remove());

  for (const category of opts.categories.safe) {
    const span = document.createElement('span');
    span.innerText = category;

    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('delete-btn');
    deleteBtn.innerText = '⨯';
    deleteBtn.title = `Unmark '${category}'`;
    deleteBtn.addEventListener('click', async () => {
      await Communication.actions.unmarkCategoryAsSafe(category);
      await populateSafedCategoriesList();
    });

    const container = document.createElement('div');
    container.classList.add('category');
    container.append(span, deleteBtn);
    list.append(container);
  }
}

function loading() {
  document.getElementById('loading').style.display = null;
  document.getElementById('loaded').style.display = 'none';
}

function loaded() {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('loaded').style.display = null;
}

window.addEventListener('DOMContentLoaded', async () => {
  loading();
  await Communication.init();
  await populateSafedCategoriesList();
  loaded();
});