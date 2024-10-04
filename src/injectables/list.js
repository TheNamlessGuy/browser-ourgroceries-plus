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

const _Generic = {
  insertFixCategoriesButton: async function(getHeaders, onClick) {
    if (document.getElementsByClassName('og+-button-container').length === 0) {
      const img = document.createElement('img');
      img.src = browser.runtime.getURL('/res/icon/48.png');
      img.style.width = '12px';

      const btn = document.createElement('button');
      btn.append(img, document.createTextNode(" Remove categories that haven't been marked as 'safe'"));
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', onClick);

      const container = document.createElement('div');
      container.classList.add('og+-button-container');
      container.append(btn);

      const list = document.getElementById('listDiv');
      list.parentElement.insertBefore(container, list);
    }

    const categoryCount = Array.from(await getHeaders()).map(x => x.getElementsByClassName('og+-checkbox')[0]).filter(x => x?.checked === false).length;
    document.getElementsByClassName('og+-button-container')[0].style.display = categoryCount > 0 ? null : 'none';
  },

  insertCategoryCheckmarks: async function(getCategories, getName, getInjectionElement, onChecked) {
    const opts = await Communication.actions.getOpts();

    const categories = Array.from(await getCategories());
    for (const category of categories) {
      const name = await getName(category);
      if (name === 'Uncategorized') { continue; }

      const checked = opts.categories.safe.includes(name);

      if (category.getElementsByClassName('og+-checkbox-container').length > 0) {
        category.getElementsByClassName('og+-checkbox')[0].checked = checked;
      } else {
        const span = document.createElement('span');
        span.innerText = 'Safe';
        span.style.marginRight = '3px';

        const checkbox = document.createElement('input');
        checkbox.classList.add('og+-checkbox');
        checkbox.type = 'checkbox';
        checkbox.checked = checked;
        checkbox.style.cursor = 'pointer';
        checkbox.addEventListener('click', (e) => e.stopPropagation());
        checkbox.addEventListener('change', async () => {
          await Communication.actions.toggleCategorySafeness(name);
          await onChecked();
        });

        const container = document.createElement('div');
        container.classList.add('og+-checkbox-container');
        container.style.float = 'right';
        container.append(span, checkbox);
        (await getInjectionElement(category)).append(container);
      }
    }
  },

  createObserver: async function(callback) {
    let ignore = false;

    const list = document.getElementById('listDiv');
    const observer = new MutationObserver(async (mutations) => {
      if (ignore) { return; }

      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          ignore = true;
          await callback();
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
};

const ShoppingList = {
  removeNonSafedCategories: async function() {
    const opts = await Communication.actions.getOpts();

    const categories = Array.from(document.getElementsByClassName('category-container'));
    for (const category of categories) {
      const name = category.getElementsByClassName('category-header')[0].childNodes[0].textContent.trim();
      if (name === 'Uncategorized' || opts.categories.safe.includes(name)) {
        continue;
      }

      const items = Array.from(category.getElementsByClassName('list-item'));
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
  },

  insertFixCategoriesButton: async function() {
    await _Generic.insertFixCategoriesButton(
      async () => document.getElementsByClassName('category-header'),
      ShoppingList.removeNonSafedCategories,
    );
  },

  insertCategoryCheckmarks: async function() {
    await _Generic.insertCategoryCheckmarks(
      async () => document.getElementsByClassName('category-header'),
      async (category) => category.childNodes[0].textContent.trim(),
      async (category) => category,
      async () => {
        await ShoppingList.insertCategoryCheckmarks();
        await ShoppingList.insertFixCategoriesButton();
      },
    );
  },

  createObserver: async function() {
    await _Generic.createObserver(async () => {
      await ShoppingList.insertCategoryCheckmarks();
      await ShoppingList.insertFixCategoriesButton();
    });
  },
};

const Categories = {
  removeNonSafedCategories: async function() {
    const opts = await Communication.actions.getOpts();

    const categories = Array.from(document.getElementsByClassName('list-item'));
    for (const category of categories) {
      const name = category.getElementsByClassName('value')[0].childNodes[0].textContent.trim();
      if (opts.categories.safe.includes(name)) { continue; }

      category.getElementsByClassName('edit')[0].click();

      const getDialog = () => Array.from(document.getElementsByClassName('ui-dialog')).filter(x => x.style.display !== 'none')[0];
      await waitFor(() => getDialog() != null);

      const getDeleteButton = () => Array.from(getDialog().querySelectorAll('button.danger-button')).filter(x => x.innerText.trim() === 'Delete Category')[0];
      await waitFor(() => getDeleteButton() != null);
      getDeleteButton().click();

      await waitFor(() => getDialog() == null);
    }
  },

  insertFixCategoriesButton: async function() {
    await _Generic.insertFixCategoriesButton(
      async () => document.getElementsByClassName('list-item'),
      Categories.removeNonSafedCategories,
    );
  },

  insertCategoryCheckmarks: async function() {
    await _Generic.insertCategoryCheckmarks(
      async () => document.getElementsByClassName('list-item'),
      async (category) => category.getElementsByClassName('value')[0].childNodes[0].textContent.trim(),
      async (category) => category.getElementsByClassName('value')[0],
      async () => {
        await Categories.insertCategoryCheckmarks();
        await Categories.insertFixCategoriesButton();
      },
    );
  },

  createObserver: async function() {
    await _Generic.createObserver(async () => {
      await Categories.insertCategoryCheckmarks();
      await ShoppingList.insertFixCategoriesButton();
    });
  },
};

async function main() {
  await waitFor(() => document.getElementById('listDiv') !== null);
  await waitFor(() => document.getElementById('listName') !== null);

  await Communication.init();

  const url = new URL(window.location.href);
  const title = document.getElementById('listName').innerText.trim();
  if (url.searchParams.has('fromShoppingListId') && title === 'Categories') {
    await Categories.insertCategoryCheckmarks();
    await Categories.insertFixCategoriesButton();
    await Categories.createObserver();
  } else {
    await ShoppingList.insertCategoryCheckmarks();
    await ShoppingList.insertFixCategoriesButton();
    await ShoppingList.createObserver();
  }
}

main();