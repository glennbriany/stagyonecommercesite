import { animate } from 'https://cdn.jsdelivr.net/npm/motion@10.18.0/+esm';

// Normalise any stray whitespace in the catalogue
if (typeof LOGIC_LABS_PRODUCTS !== 'undefined') {
  LOGIC_LABS_PRODUCTS.forEach(p => {
    p.id = p.id.trim();
    p.brand = p.brand.trim();
    p.model = p.model.trim();
    p.cpu = p.cpu.trim();
    p.ram = p.ram.trim();
    p.storage = p.storage.trim();
    p.screen = p.screen.trim();
    p.category = p.category.trim();
    if (p.gpu) p.gpu = p.gpu.trim();
    if (p.tags) p.tags = p.tags.map(t => t.trim());
  });
}

// ============================================================================
// ICONS — also exposed on window so plain <script> blocks can use them
// ============================================================================
export const ICONS = {
  whatsapp: `<svg viewBox="0 0 32 32"><path d="M16.02 3C9.4 3 4 8.38 4 15c0 2.2.6 4.27 1.64 6.05L4 29l8.14-1.6A12.9 12.9 0 0 0 16.02 27C22.63 27 28 21.62 28 15S22.63 3 16.02 3Zm7.35 17.4c-.32.9-1.6 1.65-2.6 1.86-.7.14-1.6.26-4.66-1-3.9-1.6-6.4-5.55-6.6-5.8-.2-.26-1.57-2.1-1.57-4 0-1.9.98-2.83 1.34-3.22.35-.38.77-.48 1.02-.48h.75c.24 0 .57-.1.9.68.32.78 1.1 2.68 1.2 2.87.1.2.16.42.03.68-.13.26-.2.42-.4.65-.2.23-.42.5-.6.68-.2.2-.4.4-.18.8.24.4 1.03 1.7 2.2 2.75 1.5 1.35 2.78 1.77 3.18 1.97.4.2.63.16.87-.1.24-.26 1-1.16 1.27-1.56.27-.4.53-.33.9-.2.36.13 2.3 1.1 2.7 1.3.4.2.66.3.76.47.1.17.1.98-.22 1.9Z"/></svg>`,
  laptop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="3" y="4" width="18" height="12" rx="1.6"/><path d="M1.5 20h21M9 16v2M15 16v2"/></svg>`,
  compare: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3v18M16 3v18M4 8h4M16 8h4M4 16h4M16 16h4"/></svg>`,
};

const WISHLIST_KEY = 'logic-labs-wishlist';
const CART_KEY = 'logic-labs-bag';
const BUDGET_RANGES = {
  'under-1m': [0, 1000000],
  '1m-2m': [1000000, 2000000],
  '2m-3_5m': [2000000, 3500000],
  '3_5m-up': [3500000, Infinity],
};

function matchesBudget(price, budget) {
  if (!budget || !BUDGET_RANGES[budget]) return true;
  const [minimum, maximum] = BUDGET_RANGES[budget];
  return price >= minimum && price < maximum;
}

function getSavedProductIds(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(stored) ? stored.filter(id => typeof id === 'string') : [];
  } catch (error) {
    console.warn(`[store] Could not read saved products from "${key}".`, error);
    return [];
  }
}

function saveProductIds(key, ids) {
  try {
    localStorage.setItem(key, JSON.stringify([...new Set(ids)]));
  } catch (error) {
    console.warn(`[store] Could not save products to "${key}".`, error);
  }
}

function toggleSavedProduct(key, productId) {
  const ids = getSavedProductIds(key);
  const next = ids.includes(productId) ? ids.filter(id => id !== productId) : [...ids, productId];
  saveProductIds(key, next);
  updateSavedCounts();
  if (Store.filters.wishlist) renderProducts();
  return next.includes(productId);
}

function updateSavedCounts() {
  const wishlistCount = getSavedProductIds(WISHLIST_KEY).length;
  const cartCount = getSavedProductIds(CART_KEY).length;
  document.querySelectorAll('[data-wishlist-count]').forEach(el => { el.textContent = wishlistCount; });
  document.querySelectorAll('[data-cart-count]').forEach(el => { el.textContent = cartCount; });
  document.querySelectorAll('.header-icon-link[href*="wishlist"]').forEach(el => {
    el.setAttribute('aria-label', `Wishlist, ${wishlistCount} ${wishlistCount === 1 ? 'product' : 'products'}`);
  });
  document.querySelectorAll('[data-open-cart]').forEach(el => {
    el.setAttribute('aria-label', `Shopping bag, ${cartCount} ${cartCount === 1 ? 'product' : 'products'}`);
  });
}

function heartIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>';
}

function wishlistButtonHTML(product, extraClass = '') {
  const saved = getSavedProductIds(WISHLIST_KEY).includes(product.id);
  return `<button type="button" class="wishlist-toggle ${extraClass}${saved ? ' is-saved' : ''}"
    data-wishlist-product="${product.id}" aria-pressed="${saved}"
    aria-label="${saved ? 'Remove' : 'Add'} ${product.model} ${saved ? 'from' : 'to'} wishlist">${heartIcon()}</button>`;
}
window.ICONS = ICONS;

// ============================================================================
// STATE
// ============================================================================
const Store = {
  filters: { category: 'all', search: '', sort: 'featured', budget: '', wishlist: false },

  getFilteredProducts() {
    const { category, search, sort } = this.filters;
    const q = search.trim().toLowerCase();
    const wishlist = this.filters.wishlist ? getSavedProductIds(WISHLIST_KEY) : [];

    let products = LOGIC_LABS_PRODUCTS.filter(p => {
      const matchCat = category === 'all' || p.category === category;
      const haystack = `${p.brand} ${p.model} ${p.cpu} ${p.ram} ${p.storage} ${p.gpu || ''} ${(p.tags || []).join(' ')}`.toLowerCase();
      const matchBudget = matchesBudget(p.price, this.filters.budget);
      const matchWishlist = !this.filters.wishlist || wishlist.includes(p.id);
      return matchCat && matchBudget && matchWishlist && (!q || haystack.includes(q));
    });

    if (sort === 'price-low') products = products.slice().sort((a, b) => a.price - b.price);
    else if (sort === 'price-high') products = products.slice().sort((a, b) => b.price - a.price);
    // 'featured' → in-stock first, then priciest (our best units lead)
    else products = products.slice().sort((a, b) => (b.qty > 0) - (a.qty > 0) || b.price - a.price);

    return products;
  }
};

// ============================================================================
// RENDERING
// ============================================================================
function productCardHTML(p) {
  const inStock = p.qty > 0;
  const waMsg = `Hi Logic Labs! I'm interested in the ${p.model} (${p.cpu}, ${p.ram}/${p.storage}) listed at ${formatPrice(p.price)}. Is it available?`;
  const specLine = [p.cpu, p.ram, p.storage, p.gpu].filter(Boolean).join(' · ');

  return `
    <article class="product-card" data-id="${p.id}" data-brand="${p.brand}" tabindex="0" role="button" aria-label="View larger image for ${p.model}">
      <div class="card-top">
        <div class="card-brand">${p.brand}</div>
        <div class="card-top-right">
          <span class="badge-stock ${inStock ? 'in' : 'out'}">${inStock ? 'In stock' : 'Sold out'}</span>
          ${wishlistButtonHTML(p, 'card-wishlist')}
          <a class="card-compare" href="compare.html?a=${encodeURIComponent(p.id)}"
             aria-label="Compare the ${p.model}" title="Compare this laptop">${ICONS.compare}</a>
        </div>
      </div>
      <div class="card-media">
        ${p.image
          ? `<img class="card-photo" src="${p.image}" alt="${p.model}" loading="lazy" onerror="this.outerHTML=window.ICONS.laptop">`
          : ICONS.laptop}
      </div>
      <div class="card-body">
        <h3 class="card-title">${p.model}</h3>
        <p class="card-specline">${specLine}</p>
      </div>
      <div class="card-footer">
        <div class="price">${formatPrice(p.price)}</div>
        <div class="card-footer-actions">
        <button type="button" class="card-bag-button" data-add-to-cart="${p.id}" ${inStock ? '' : 'disabled'}
                aria-label="Add ${p.model} to shopping bag" title="Add to shopping bag">+</button>
        <a class="btn-add-cart ${inStock ? '' : 'disabled'}"
           href="${inStock ? waLink(waMsg) : '#'}"
           ${inStock ? 'target="_blank" rel="noopener"' : 'aria-disabled="true" tabindex="-1"'}
           aria-label="${inStock ? `Ask about the ${p.model} on WhatsApp` : 'Out of stock'}">
          ${ICONS.whatsapp}<span>${inStock ? 'Ask' : 'Sold'}</span>
        </a>
        </div>
      </div>
    </article>`;
}

function renderProducts() {
  const grid = document.querySelector('.product-grid');
  if (!grid) return;

  const countEl = document.querySelector('.result-count');
  const products = Store.getFilteredProducts();

  if (countEl) {
    countEl.textContent = `${products.length} laptop${products.length !== 1 ? 's' : ''}`;
  }

  if (!products.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>No laptops match that</h3>
        <p>${Store.filters.wishlist ? 'Your wishlist is empty. Save a laptop with the heart button to see it here.' : 'Try a different category, budget, or search — or just ask us on WhatsApp.'}</p>
      </div>`;
    return;
  }

  grid.innerHTML = products.map(productCardHTML).join('');

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReduced) {
    animate('.product-card',
      { opacity: [0, 1], y: [16, 0] },
      { delay: (i) => Math.min(i, 12) * 0.03, type: 'spring', bounce: 0.1, duration: 0.5 });
  }
}

function renderFilterChips() {
  const sidebar = document.querySelector('.filter-groups');
  const mobileBar = document.querySelector('.mobile-filter-bar');
  if (!sidebar && !mobileBar) return;

  // Only show categories that actually have stock listed
  const counts = LOGIC_LABS_PRODUCTS.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});

  const chip = (key, label) =>
    `<button class="filter-chip ${Store.filters.category === key ? 'active' : ''}" data-category="${key}">${label}</button>`;

  const chips = Object.entries(CATEGORY_LABELS)
    .filter(([key]) => counts[key])
    .map(([key, label]) => chip(key, `${label} (${counts[key]})`))
    .join('');

  const all = chip('all', `All (${LOGIC_LABS_PRODUCTS.length})`);

  if (sidebar) sidebar.innerHTML = `<div class="filter-group"><h3>Category</h3>${all}${chips}</div>`;
  if (mobileBar) mobileBar.innerHTML = all + chips;

  document.querySelectorAll('.filter-chip').forEach(el => {
    el.addEventListener('click', () => {
      Store.filters.category = el.dataset.category;
      renderFilterChips();
      renderProducts();
    });
  });
}

/**
 * Homepage: the flagship in-stock unit from each brand, priciest brands first.
 * Picking per-brand (rather than straight by price) keeps the row varied —
 * otherwise one brand's premium models fill every slot.
 */
function renderFeatured() {
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;

  let products = LOGIC_LABS_PRODUCTS.filter(product => product.qty > 0 && matchesBudget(product.price, Store.filters.budget));
  if (!Store.filters.budget) {
    const bestPerBrand = new Map();
    for (const product of products) {
      const current = bestPerBrand.get(product.brand);
      if (!current || product.price > current.price) bestPerBrand.set(product.brand, product);
    }
    products = [...bestPerBrand.values()];
  }
  products.sort((a, b) => b.price - a.price);
  const featured = products.slice(0, 4);
  grid.innerHTML = featured.map(homeProductRowHTML).join('');
  const empty = document.getElementById('featuredEmpty');
  if (empty) empty.hidden = featured.length > 0;
  const seeAll = document.querySelector('.home-picks .home-text-link');
  if (seeAll) {
    const params = new URLSearchParams();
    if (Store.filters.budget) params.set('budget', Store.filters.budget);
    const query = params.toString();
    seeAll.href = `products.html${query ? `?${query}` : ''}`;
  }
}

function homeProductRowHTML(product) {
  const specs = [product.cpu, product.ram, product.storage, product.gpu].filter(Boolean).join(' · ');
  const image = product.image
    ? `<img src="${product.image}" alt="${product.model}" loading="lazy">`
    : '';
  return `<article class="home-product-row">
    <a class="home-product-image" href="products.html?category=${encodeURIComponent(product.category)}" tabindex="-1" aria-hidden="true">${image}</a>
    <div class="home-product-info">
      <p class="home-product-brand">${product.brand}</p>
      <h3><a href="products.html?category=${encodeURIComponent(product.category)}">${product.model}</a></h3>
      <p class="home-product-specs">${specs}</p>
      <p class="home-product-price">${formatPrice(product.price)}</p>
    </div>
    <div class="home-product-actions">
      ${wishlistButtonHTML(product, 'home-wishlist')}
      <button type="button" class="home-bag-button" data-add-to-cart="${product.id}" aria-label="Add ${product.model} to shopping bag" title="Add to shopping bag">+</button>
    </div>
  </article>`;
}

/** Homepage: fixed editorial category tiles with starting prices from stock. */
function renderHomeCategories() {
  const grid = document.getElementById('homeCategoryGrid');
  if (!grid) return;

  const categories = [
    { key: 'gaming', label: 'Gaming', theme: 'gaming', image: 'omen22.png' },
    { key: 'business', label: 'Business', theme: 'business', image: 'x110th.png' },
    { key: 'apple', label: 'Apple', theme: 'apple', image: 'macprom4.png' },
    { key: 'budget', label: 'Budget', theme: 'budget', image: 'lenovo11e.png' },
  ];

  grid.innerHTML = categories.map(category => {
    const inStock = LOGIC_LABS_PRODUCTS.filter(product => product.category === category.key && product.qty > 0);
    const products = inStock.length ? inStock : LOGIC_LABS_PRODUCTS.filter(product => product.category === category.key);
    const startingPrice = products.reduce((lowest, product) => Math.min(lowest, product.price), Infinity);
    const image = category.image
      ? `<img class="home-category-image" src="${category.image}" alt="" aria-hidden="true" loading="lazy">`
      : '';
    return `<a class="home-category-tile home-category-${category.theme}" href="products.html?category=${category.key}">
      ${image}
      <span class="home-category-kicker">SHOP ${category.label.toUpperCase()}</span>
      <span class="home-category-title">${category.label}</span>
      <span class="home-category-price">${Number.isFinite(startingPrice) ? `From ${formatPrice(startingPrice)}` : 'Explore laptops'}</span>
      <span class="home-category-arrow" aria-hidden="true">↗</span>
    </a>`;
  }).join('');

  grid.querySelectorAll('.home-category-image').forEach(image => {
    image.addEventListener('error', () => {
      console.warn(`[category banner] could not load "${image.getAttribute('src')}".`);
      image.remove();
    }, { once: true });
  });
}

/** Homepage: wire the primary WhatsApp enquiry action to the configured store. */
function initHomeHero() {
  const link = document.getElementById('homeWa');
  if (link) link.href = waLink("Hi Logic Labs! I'd like help choosing a laptop. My budget is...");
}

function initHomeComparison() {
  const form = document.getElementById('homeCompareForm');
  const slots = [document.getElementById('homeCompareA'), document.getElementById('homeCompareB')];
  if (!form || slots.some(slot => !slot)) return;

  const products = LOGIC_LABS_PRODUCTS.slice().sort((a, b) =>
    a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model));
  slots.forEach(select => {
    select.innerHTML += products.map(product =>
      `<option value="${product.id}">${product.brand} · ${product.model}${product.qty === 0 ? ' (sold out)' : ''}</option>`
    ).join('');
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (slots[0].value === slots[1].value) {
      slots[1].setCustomValidity('Choose a different laptop to compare.');
      slots[1].reportValidity();
      return;
    }
    slots[1].setCustomValidity('');
    location.href = `compare.html?a=${encodeURIComponent(slots[0].value)}&b=${encodeURIComponent(slots[1].value)}`;
  });
  slots[1].addEventListener('change', () => slots[1].setCustomValidity(''));
}

function initBudgetFilters() {
  const buttons = [...document.querySelectorAll('.budget-filter')];
  if (!buttons.length) return;
  const selected = Store.filters.budget || 'all';
  buttons.forEach(button => {
    const active = button.dataset.budget === selected;
    button.classList.toggle('is-selected', active);
    button.setAttribute('aria-pressed', String(active));
    button.addEventListener('click', () => {
      Store.filters.budget = button.dataset.budget === 'all' ? '' : button.dataset.budget;
      buttons.forEach(option => {
        const isSelected = option === button;
        option.classList.toggle('is-selected', isSelected);
        option.setAttribute('aria-pressed', String(isSelected));
      });
      renderFeatured();
    });
  });
}

function renderCart() {
  const list = document.getElementById('homeCartItems');
  const checkout = document.getElementById('homeCartWhatsApp');
  if (!list || !checkout) return;

  const ids = getSavedProductIds(CART_KEY);
  const items = ids.map(id => LOGIC_LABS_PRODUCTS.find(product => product.id === id)).filter(Boolean);
  if (items.length !== ids.length) saveProductIds(CART_KEY, items.map(product => product.id));
  updateSavedCounts();

  list.innerHTML = items.length ? items.map(product => `
    <div class="home-cart-item">
      <span>${product.brand} · ${product.model}<small>${formatPrice(product.price)}</small></span>
      <button type="button" data-remove-cart="${product.id}" aria-label="Remove ${product.model} from bag">Remove</button>
    </div>`).join('') : '<p class="home-cart-empty">Your bag is empty. Add a laptop from the recommendations.</p>';

  const message = items.length
    ? `Hi Logic Labs! I'd like to enquire about:\n${items.map(product => `- ${product.brand} ${product.model} (${formatPrice(product.price)})`).join('\n')}`
    : 'Hi Logic Labs! I have a question about your laptops.';
  checkout.href = waLink(message);
  if (!items.length) checkout.href = '#';
  checkout.classList.toggle('is-disabled', !items.length);
  checkout.setAttribute('aria-disabled', String(!items.length));
}

function initStoreControls() {
  updateSavedCounts();
  initHomeComparison();
  initBudgetFilters();
  renderCart();

  const menuButton = document.querySelector('.home-menu-toggle');
  const navigation = document.getElementById('siteNavigation');
  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    navigation?.classList.toggle('is-open', open);
  });

  document.addEventListener('click', event => {
    if (event.target.closest('#homeCartWhatsApp.is-disabled')) {
      event.preventDefault();
      return;
    }

    const wishlist = event.target.closest('[data-wishlist-product]');
    if (wishlist) {
      const isSaved = toggleSavedProduct(WISHLIST_KEY, wishlist.dataset.wishlistProduct);
      document.querySelectorAll(`[data-wishlist-product="${CSS.escape(wishlist.dataset.wishlistProduct)}"]`).forEach(button => {
        button.classList.toggle('is-saved', isSaved);
        button.setAttribute('aria-pressed', String(isSaved));
        button.setAttribute('aria-label', `${isSaved ? 'Remove' : 'Add'} ${LOGIC_LABS_PRODUCTS.find(product => product.id === wishlist.dataset.wishlistProduct)?.model || 'laptop'} ${isSaved ? 'from' : 'to'} wishlist`);
      });
      return;
    }

    const addToBag = event.target.closest('[data-add-to-cart]');
    if (addToBag) {
      const product = LOGIC_LABS_PRODUCTS.find(item => item.id === addToBag.dataset.addToCart);
      if (!product || product.qty <= 0) return;
      saveProductIds(CART_KEY, [...getSavedProductIds(CART_KEY), product.id]);
      renderCart();
      addToBag.classList.add('is-added');
      window.setTimeout(() => addToBag.classList.remove('is-added'), 500);
      return;
    }

    const removeFromBag = event.target.closest('[data-remove-cart]');
    if (removeFromBag) {
      saveProductIds(CART_KEY, getSavedProductIds(CART_KEY).filter(id => id !== removeFromBag.dataset.removeCart));
      renderCart();
      return;
    }

    if (event.target.closest('[data-open-cart]')) {
      const dialog = document.getElementById('homeCartDialog');
      renderCart();
      if (dialog && !dialog.open) dialog.showModal();
      return;
    }
    if (event.target.closest('[data-close-cart]')) document.getElementById('homeCartDialog')?.close();
  });

  document.querySelector('.home-cart-dialog')?.addEventListener('click', event => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') {
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Open menu');
      navigation?.classList.remove('is-open');
    }
  });

  window.addEventListener('storage', event => {
    if ([WISHLIST_KEY, CART_KEY].includes(event.key)) {
      updateSavedCounts();
      if (event.key === CART_KEY) renderCart();
      if (event.key === WISHLIST_KEY && Store.filters.wishlist) renderProducts();
    }
  });
}

// ============================================================================
// SHARED CHROME
// ============================================================================
function initScrollEdge() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const update = () => header.classList.toggle('scrolled', window.scrollY > 4);
  update();
  window.addEventListener('scroll', update, { passive: true });
}

function initPressFeedback() {
  const targets = '.btn-add-cart, .btn-primary, .btn-ghost, .btn-wa, .filter-chip, .wa-float, .product-card, .category-card';
  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest(targets);
    if (!el) return;
    animate(el, { scale: 0.97 }, { duration: 0.1 });
    const release = () => {
      animate(el, { scale: 1 }, { type: 'spring', bounce: 0, duration: 0.4 });
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
  });
}

function getProductImageModal() {
  let modal = document.getElementById('productImageModal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'productImageModal';
  modal.className = 'product-image-modal';
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <div class="product-image-modal__backdrop" data-close-product-image="true"></div>
    <div class="product-image-modal__panel" role="dialog" aria-modal="true" aria-labelledby="productImageTitle">
      <button class="product-image-modal__close" type="button" aria-label="Close product image">×</button>
      <div class="product-image-modal__media">
        <img class="product-image-modal__img" src="" alt="">
      </div>
      <div class="product-image-modal__meta">
        <span class="product-image-modal__brand"></span>
        <h3 id="productImageTitle" class="product-image-modal__title"></h3>
      </div>
    </div>
  `;

  modal.addEventListener('click', (e) => {
    if (e.target.closest('[data-close-product-image]') || e.target.closest('.product-image-modal__close')) {
      closeProductImageModal();
    }
  });

  document.body.appendChild(modal);
  return modal;
}

function openProductImageModal(card) {
  const modal = getProductImageModal();
  const photo = card.querySelector('.card-photo');
  if (!photo || !photo.getAttribute('src')) return;

  const modalImg = modal.querySelector('.product-image-modal__img');
  const modalBrand = modal.querySelector('.product-image-modal__brand');
  const modalTitle = modal.querySelector('.product-image-modal__title');
  const product = LOGIC_LABS_PRODUCTS.find(p => p.id === card.dataset.id);

  modalImg.src = photo.src;
  modalImg.alt = photo.alt || (product ? product.model : 'Laptop product image');
  modalBrand.textContent = product ? product.brand : '';
  modalTitle.textContent = product ? product.model : '';

  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closeProductImageModal() {
  const modal = document.getElementById('productImageModal');
  if (!modal) return;

  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

function initProductImageViewer() {
  document.addEventListener('click', (event) => {
    const card = event.target.closest('.product-card');
    if (!card) return;

    const interactive = event.target.closest('a, button, input, select, textarea');
    if (interactive) return;

    openProductImageModal(card);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeProductImageModal();
      return;
    }

    if ((event.key === 'Enter' || event.key === ' ') && document.activeElement && document.activeElement.classList.contains('product-card')) {
      event.preventDefault();
      openProductImageModal(document.activeElement);
    }
  });
}

function initReveal() {
  const els = document.querySelectorAll('[data-reveal]');
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
  els.forEach(el => io.observe(el));
}

/** Wires footer/nav WhatsApp + social links and the year stamp on every page. */
function initSharedLinks() {
  const setHref = (id, href) => { const el = document.getElementById(id); if (el) el.href = href; };

  setHref('floatWa', waLink("Hi Logic Labs! I'd like some help choosing a laptop."));
  setHref('ftWa', waLink('Hi Logic Labs! I have a question about your laptops.'));
  setHref('ftInsta', LOGIC_LABS_CONFIG.instagram);
  setHref('ftTiktok', LOGIC_LABS_CONFIG.tiktok);
  setHref('ftFb', LOGIC_LABS_CONFIG.facebook);

  const floatWa = document.getElementById('floatWa');
  if (floatWa && !floatWa.innerHTML.trim()) floatWa.innerHTML = ICONS.whatsapp;

  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  // Mark the current page in the desktop nav and mobile tab bar
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.classList.toggle('is-active', el.dataset.nav === page);
  });
}

// ============================================================================
// INIT
// ============================================================================
function init() {
  initSharedLinks();
  initScrollEdge();
  initPressFeedback();
  initProductImageViewer();
  initReveal();

  // Honour ?category= deep links from the homepage category tiles
  const wanted = new URLSearchParams(location.search).get('category');
  if (wanted && (wanted === 'all' || CATEGORY_LABELS[wanted])) {
    Store.filters.category = wanted;
  }
  const budget = new URLSearchParams(location.search).get('budget');
  if (budget && BUDGET_RANGES[budget]) Store.filters.budget = budget;
  Store.filters.wishlist = new URLSearchParams(location.search).get('wishlist') === '1';

  renderFilterChips();
  renderProducts();
  renderFeatured();
  renderHomeCategories();
  initHomeHero();
  initStoreControls();
  initReveal();   // again, so freshly-rendered category tiles animate in

  const searchInput = document.querySelector('.search-input[type="search"]');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      Store.filters.search = e.target.value;
      renderProducts();
    });
  }

  const sortSelect = document.querySelector('.sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      Store.filters.sort = e.target.value;
      renderProducts();
    });
  }
}

// Modules run before DOMContentLoaded fires, but guard in case of late loading.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}