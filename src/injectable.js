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
    toggleCategorySafeness: async function(category) {
      await Communication._send('toggle-category-safeness', {category});
    },
  },
};

function waitFor(callback, interval = 250) {
  return new Promise((resolve) => {
    if (callback()) {
      resolve();
      return;
    }

    const id = setInterval(() => {
      if (callback()) {
        clearInterval(id);
        resolve();
      }
    }, interval);
  });
}

async function removeNonSafedCategories() {
  const opts = await Communication.actions.getOpts();

  const categories = document.getElementsByClassName('category-container');
  for (const category of categories) {
    const name = category.getElementsByClassName('category-header')[0].childNodes[0].textContent.trim();
    if (name === 'Uncategorized' || opts.categories.safe.includes(name)) {
      continue;
    }

    const items = category.getElementsByClassName('list-item');
    for (const item of items) {
      item.getElementsByClassName('edit')[0].click();
      await waitFor(() => document.getElementsByTagName('dialog').length > 0);

      const dialog = document.getElementsByTagName('dialog')[0];
      const label = Array.from(dialog.getElementsByTagName('label')).find(x => x.innerText.trim() === 'Category:');
      const select = label.parentElement.getElementsByTagName('select')[0];
      select.value = 'uncategorized';
      dialog.getElementsByClassName('submit-button')[0].click();

      await waitFor(() => document.getElementsByTagName('dialog').length === 0);
    }
  }
}

async function insertFixCategoriesButton() {
  if (document.getElementsByClassName('og+-button-container').length === 0) {
    const img = document.createElement('img');
    img.src = browser.runtime.getURL('/res/icon/48.png');
    img.style.width = '12px';

    const btn = document.createElement('button');
    btn.append(img, document.createTextNode(" Remove categories that haven't been marked as 'safe'"));
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', removeNonSafedCategories);

    const container = document.createElement('div');
    container.classList.add('og+-button-container');
    container.append(btn);

    const list = document.getElementById('listDiv');
    list.parentElement.insertBefore(container, list);
  }

  const categoryCount = Array.from(document.getElementsByClassName('category-header')).map(x => x.getElementsByClassName('og+-checkbox')[0]).filter(x => x?.checked === false).length;
  document.getElementsByClassName('og+-button-container')[0].style.display = categoryCount > 0 ? null : 'none';
}

async function insertCategoryCheckmarks() {
  const opts = await Communication.actions.getOpts();

  const categories = document.getElementsByClassName('category-header');
  for (const category of categories) {
    const name = category.childNodes[0].textContent;
    if (name === 'Uncategorized') { continue; }

    if (category.getElementsByClassName('og+-checkbox-container').length > 0) {
      category.getElementsByClassName('og+-checkbox')[0].checked = opts.categories.safe.includes(name);
    } else {
      const span = document.createElement('span');
      span.innerText = 'Safe';
      span.style.marginRight = '3px';

      const checkbox = document.createElement('input');
      checkbox.classList.add('og+-checkbox');
      checkbox.type = 'checkbox';
      checkbox.checked = opts.categories.safe.includes(name);
      checkbox.style.cursor = 'pointer';
      checkbox.addEventListener('change', async () => {
        await Communication.actions.toggleCategorySafeness(name);
        await insertCategoryCheckmarks();
        await insertFixCategoriesButton();
      });

      const container = document.createElement('div');
      container.classList.add('og+-checkbox-container');
      container.style.float = 'right';
      container.append(span, checkbox);
      category.append(container);
    }
  }
}

async function createObserver() {
  let ignore = false;

  const list = document.getElementById('listDiv');
  const observer = new MutationObserver(async (mutations) => {
    if (ignore) { return; }

    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        ignore = true;
        await insertCategoryCheckmarks();
        await insertFixCategoriesButton();
        ignore = false;
        break;
      }
    }
  });

  observer.observe(list, {
    subtree: true,
    childList: true,
  });
}

async function main() {
  await waitFor(() => document.getElementById('listDiv') !== null);

  await Communication.init();
  await insertCategoryCheckmarks();
  await insertFixCategoriesButton();
  await createObserver();
}

main();