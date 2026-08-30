
const STAGYON_CONFIG = {
  whatsappNumber: "256752624582",
  businessName: "Stagyon",
  city: "Kampala, Uganda",
  instagram: "https://instagram.com/stagyon",
  tiktok: "https://tiktok.com/@stagyon",
  facebook: "https://facebook.com/stagyon",
  // Homepage hero banner — swap the file this points to (or the path itself)
  // whenever the current offer/promotion changes. Nothing else needs to change.
  // Add a version query string to bust caches on devices that still have
  // the old image cached.
  promoBanner: "banner2.jpeg?v=3",
  promoBannerAlt: "Current promotion",
};

/** Builds a wa.me deep link with a pre-filled message. */
function waLink(message) {
  const base = `https://wa.me/${STAGYON_CONFIG.whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

function formatPrice(ugx) {
  return "USh " + Number(ugx).toLocaleString("en-US");
}
