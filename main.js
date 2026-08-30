

import { animate } from 'https://cdn.jsdelivr.net/npm/motion@10.18.0/+esm';

// Normalise any stray whitespace in the catalogue
if (typeof STAGYON_PRODUCTS !== 'undefined') {
  STAGYON_PRODUCTS.forEach(p => {
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
window.ICONS = ICONS;

// ============================================================================
// STATE
// ============================================================================
const Store = {
  filters: { category: 'all', search: '', sort: 'featured' },

  getFilteredProducts() {
    const { category, search, sort } = this.filters;
    const q = search.trim().toLowerCase();

    let products = STAGYON_PRODUCTS.filter(p => {
      const matchCat = category === 'all' || p.category === category;
      const haystack = `${p.brand} ${p.model} ${p.cpu} ${p.ram} ${p.storage} ${p.gpu || ''} ${(p.tags || []).join(' ')}`.toLowerCase();
      return matchCat && (!q || haystack.includes(q));
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
  const waMsg = `Hi Stagyon! I'm interested in the ${p.model} (${p.cpu}, ${p.ram}/${p.storage}) listed at ${formatPrice(p.price)}. Is it available?`;

  return `
    <article class="product-card" data-id="${p.id}">
      <div class="card-media">
        <span class="badge-stock ${inStock ? 'in' : 'out'}">${inStock ? 'In stock' : 'Sold out'}</span>
        <a class="card-compare" href="compare.html?a=${encodeURIComponent(p.id)}"
           aria-label="Compare the ${p.model}" title="Compare this laptop">${ICONS.compare}</a>
        <span class="card-ghost" aria-hidden="true">${p.brand}</span>
        ${p.image
          ? `<img class="card-photo" src="${p.image}" alt="${p.model}" loading="lazy" onerror="this.remove()">`
          : ICONS.laptop}
      </div>
      <div class="card-body">
        <div class="card-brand">${p.brand}</div>
        <h3 class="card-title">${p.model}</h3>
        <div class="card-specs">
          <span class="spec-label">CPU</span><span>${p.cpu}</span>
          <span class="spec-label">RAM</span><span>${p.ram}</span>
          <span class="spec-label">SSD</span><span>${p.storage}</span>
          ${p.gpu ? `<span class="spec-label">GPU</span><span>${p.gpu}</span>` : ''}
        </div>
      </div>
      <div class="card-footer">
        <div class="price">${formatPrice(p.price)}</div>
        <a class="btn-add-cart ${inStock ? '' : 'disabled'}"
           href="${inStock ? waLink(waMsg) : '#'}"
           ${inStock ? 'target="_blank" rel="noopener"' : 'aria-disabled="true" tabindex="-1"'}
           aria-label="${inStock ? `Ask about the ${p.model} on WhatsApp` : 'Out of stock'}">
          ${ICONS.whatsapp}<span>${inStock ? 'Ask' : 'Sold'}</span>
        </a>
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
        <p>Try a different category or clear your search — or just ask us on WhatsApp.</p>
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
  const counts = STAGYON_PRODUCTS.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});

  const chip = (key, label) =>
    `<button class="filter-chip ${Store.filters.category === key ? 'active' : ''}" data-category="${key}">${label}</button>`;

  const chips = Object.entries(CATEGORY_LABELS)
    .filter(([key]) => counts[key])
    .map(([key, label]) => chip(key, `${label} (${counts[key]})`))
    .join('');

  const all = chip('all', `All (${STAGYON_PRODUCTS.length})`);

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

  const bestPerBrand = new Map();
  for (const p of STAGYON_PRODUCTS) {
    if (p.qty <= 0) continue;
    const current = bestPerBrand.get(p.brand);
    if (!current || p.price > current.price) bestPerBrand.set(p.brand, p);
  }

  const featured = [...bestPerBrand.values()]
    .sort((a, b) => b.price - a.price)
    .slice(0, 4);

  grid.innerHTML = featured.map(productCardHTML).join('');
}

/** Homepage: category tiles with counts straight from the catalogue. */
function renderCategories() {
  const grid = document.getElementById('categoryGrid');
  if (!grid) return;

  const counts = STAGYON_PRODUCTS.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1; return acc;
  }, {});

  grid.innerHTML = Object.entries(CATEGORY_LABELS)
    .filter(([key]) => counts[key])
    .sort((a, b) => counts[b[0]] - counts[a[0]])
    .slice(0, 5)
    .map(([key, label]) => `
      <a class="category-card reveal" data-reveal href="products.html?category=${key}">
        <h3>${label}</h3>
        <div class="count">${counts[key]} laptop${counts[key] !== 1 ? 's' : ''} →</div>
      </a>`).join('');
}

// ============================================================================
// VIDEO BELT (homepage hero)
// ============================================================================
// Folder your clips live in, relative to index.html.
//   ''        → clips sit next to index.html
//   'media/'  → clips sit in a media folder
// Must end with a slash if you use one.
const BELT_DIR = '';

// Any number of clips works — the belt keeps a constant speed either way.
// `poster` and `webm` are both optional; list just the mp4 if that's all
// you have. Filenames are case-sensitive on most web hosts.
const BELT_CLIPS = [
  { mp4: 'clip-1.mp4' },
  { mp4: 'clip11.mp4' },
  { mp4: 'clip3.mp4' },
  { mp4: 'clip4.mp4' },
  { mp4: 'clip5.mp4' },
  { mp4: 'clip6.mp4' },
  { mp4: 'clip7.mp4' },
  { mp4: 'clip8.mp4' },
  { mp4: 'clip9.mp4' },
  { mp4: 'clip10.mp4' },
];

// Roughly how long each clip takes to cross the screen. Keeping this per-clip
// (rather than a fixed total) means adding or removing clips doesn't change
// how fast the belt moves.
const BELT_SECONDS_PER_CLIP = 7;

function initVideoBelt() {
  const belt = document.getElementById('videoBelt');
  const track = document.getElementById('videoBeltTrack');
  if (!belt || !track) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const tile = (c) => {
    const poster = c.poster ? ` poster="${BELT_DIR}${c.poster}"` : '';
    // With a webm alternative we list both and let the browser choose. With a
    // single file we set src directly and omit the type attribute — if the
    // declared type doesn't match the file exactly (a .mov, say), a <source>
    // gets skipped without even trying, whereas a bare src is always attempted.
    const sources = c.webm
      ? `<source src="${BELT_DIR}${c.webm}" type="video/webm">
         <source src="${BELT_DIR}${c.mp4}" type="video/mp4">`
      : '';
    const src = c.webm ? '' : ` src="${BELT_DIR}${c.mp4}"`;

    return `
      <div class="belt-tile">
        <video${src}${poster} muted loop playsinline preload="metadata"
               disablepictureinpicture tabindex="-1">${sources}</video>
      </div>`;
  };

  // Rendered twice: the CSS scrolls the track to -50%, which lands exactly on
  // the start of the duplicate set, so the loop has no visible seam.
  const once = BELT_CLIPS.map(tile).join('');
  track.innerHTML = reduced ? once : once + once;
  track.style.animationDuration = (BELT_CLIPS.length * BELT_SECONDS_PER_CLIP) + 's';

  const videos = [...track.querySelectorAll('video')];

  // Name any clip the browser can't play, so a typo or bad codec is obvious
  // in the console instead of just showing an empty tile.
  videos.forEach(v => {
    v.addEventListener('error', () => {
      const f = (v.currentSrc || v.getAttribute('src') || '').split('/').pop() || '(unknown)';
      console.warn(`[video belt] could not play "${f}" — check the filename, or re-export it as H.264 MP4.`);
    }, { once: true });
  });

  // Reduced motion: leave the clips paused on their poster frames.
  if (reduced) return;

  // Only decode video while the belt is actually on screen — saves battery
  // and mobile data once the visitor scrolls past the hero.
  const io = new IntersectionObserver(entries => {
    const visible = entries[0].isIntersecting;
    videos.forEach(v => {
      if (visible) { const p = v.play(); if (p) p.catch(() => {}); }
      else v.pause();
    });
  }, { threshold: 0 });
  io.observe(belt);
}

/** Homepage hero: live stock count + budget-enquiry links + promo banner. */
function initHomeHero() {
  const note = document.getElementById('heroStockNote');
  if (note) {
    const n = STAGYON_PRODUCTS.filter(p => p.qty > 0).length;
    note.textContent = `${n} laptops in stock right now`;
  }
  const msg = "Hi Stagyon! I'd like help picking a laptop. My budget is...";
  ['heroWa', 'ctaWa'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.href = waLink(msg); el.target = '_blank'; el.rel = 'noopener'; }
  });
  const banner = document.getElementById('heroBanner');
  if (banner && STAGYON_CONFIG.promoBanner) {
    banner.src = STAGYON_CONFIG.promoBanner;
    banner.alt = STAGYON_CONFIG.promoBannerAlt || 'Current promotion';
  }
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

  setHref('floatWa', waLink("Hi Stagyon! I'd like some help choosing a laptop."));
  setHref('topNavWa', waLink('Hi Stagyon! I have a question about your laptops.'));
  setHref('ftWa', waLink('Hi Stagyon! I have a question about your laptops.'));
  setHref('ftInsta', STAGYON_CONFIG.instagram);
  setHref('ftTiktok', STAGYON_CONFIG.tiktok);
  setHref('ftFb', STAGYON_CONFIG.facebook);

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
  initReveal();

  // Honour ?category= deep links from the homepage category tiles
  const wanted = new URLSearchParams(location.search).get('category');
  if (wanted && (wanted === 'all' || CATEGORY_LABELS[wanted])) {
    Store.filters.category = wanted;
  }

  renderFilterChips();
  renderProducts();
  renderFeatured();
  renderCategories();
  initHomeHero();
  initVideoBelt();
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