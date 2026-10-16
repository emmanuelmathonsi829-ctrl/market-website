// 1. PRODUCT CATALOGUE
// Edit this list to add, remove, or update products.
const products = [
  {
    id: 1,
    name: "Cloud Runner",
    category: "Sneakers",
    price: 128,
    color: "Ivory",
    image: "https://images.unsplash.com/photo-1555145777-08bc06f96c63?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 2,
    name: "Studio Headphones",
    category: "Tech",
    price: 189,
    color: "Black",
    image: "https://images.unsplash.com/photo-1714317437446-3ccdaf33eeea?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 3,
    name: "Everyday Camera",
    category: "Tech",
    price: 245,
    color: "Silver",
    image: "https://images.unsplash.com/photo-1622086634181-3f944f83a49e?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 4,
    name: "High Top One",
    category: "Sneakers",
    price: 152,
    color: "White",
    image: "https://images.unsplash.com/photo-1611495167502-5a51c74ec4b4?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 5,
    name: "Weekend Essentials",
    category: "Lifestyle",
    price: 98,
    color: "Mixed",
    image: "https://images.unsplash.com/photo-1713929689473-572aeaa5ae12?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 6,
    name: "Mono Trainer",
    category: "Sneakers",
    price: 135,
    color: "Graphite",
    image: "https://images.unsplash.com/photo-1648818283312-0ef710ca1aae?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 7,
    name: "Artisan Sourdough",
    category: "Food",
    price: 85,
    color: "Fresh baked",
    image: "https://images.unsplash.com/photo-1643369176535-139e9722209c?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 8,
    name: "Bakery Selection",
    category: "Food",
    price: 145,
    color: "Assorted",
    image: "https://images.unsplash.com/photo-1547033965-5dd4885e88ae?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 9,
    name: "Classic Oxford Shirt",
    category: "Clothes",
    price: 699,
    color: "Sky blue",
    image: "https://images.unsplash.com/photo-1602810316693-3667c854239a?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 10,
    name: "Polka Dot Scarf",
    category: "Clothes",
    price: 349,
    color: "Black & white",
    image: "https://images.unsplash.com/photo-1602810319428-019690571b5b?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 11,
    name: "Textured Ceramic Vase",
    category: "Uncategorised",
    price: 450,
    color: "Chalk white",
    image: "https://images.unsplash.com/photo-1755696923054-df9b046619df?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 12,
    name: "Sculptural Bookend",
    category: "Uncategorised",
    price: 520,
    color: "Stone",
    image: "https://images.unsplash.com/photo-1706240175751-4ac7fa559d2b?auto=format&fit=crop&w=900&q=85",
  },
];

// 2. APPLICATION STATE
// These variables remember the shopper’s current selections. these values remember what the shopper selected.
let activeCategory = "All";
let showOnlyLiked = false;
const likedProducts = new Set([2]);
const cartProducts = new Set();

const productGrid = document.querySelector("#productGrid");
const emptyState = document.querySelector("#emptyState");
const searchInput = document.querySelector("#searchInput");
const cartCount = document.querySelector("#cartCount");
const settingsPanel = document.querySelector("#settingsPanel");
const accountBackdrop = document.querySelector("#accountBackdrop");
const toast = document.querySelector("#toast");
const randFormatter = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  maximumFractionDigits: 0,
});

// 3. REUSABLE ICONS
// SVG markup used inside product-card buttons. for product buttons.
const heartIcon = `
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/>
  </svg>`;

const bagIcon = `
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
    <path d="M5 8h14l-1 13H6L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>
  </svg>`;

// 4. PRODUCT DISPLAY
// Filter the catalogue and build the product cards. and applies search/category filters.
function renderProducts() {
  const query = searchInput.value.trim().toLowerCase();
  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      activeCategory === "All" || product.category === activeCategory;
    const matchesSearch =
      product.name.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query);
    const matchesLiked = !showOnlyLiked || likedProducts.has(product.id);
    return matchesCategory && matchesSearch && matchesLiked;
  });

  productGrid.innerHTML = filteredProducts
    .map(
      (product, index) => `
        <article class="product-card">
          <div class="product-image">
            <img src="${product.image}" alt="${product.name}" />
            <span class="product-tag">${index < 2 ? "New drop" : product.category}</span>
            <button
              class="like-button ${likedProducts.has(product.id) ? "liked" : ""}"
              data-like="${product.id}"
              aria-label="${likedProducts.has(product.id) ? "Unlike" : "Like"} ${product.name}"
              type="button"
            >
              ${heartIcon}
            </button>
          </div>
          <div class="product-info">
            <div>
              <p class="product-meta">${product.color} · ${product.category}</p>
              <h3 class="product-name">${product.name}</h3>
            </div>
            <p class="product-price">${randFormatter.format(product.price)}</p>
          </div>
          <button
            class="cart-button ${cartProducts.has(product.id) ? "added" : ""}"
            data-cart="${product.id}"
            type="button"
          >
            ${bagIcon}
            ${cartProducts.has(product.id) ? "Added to cart" : "Add to cart"}
          </button>
        </article>
      `,
    )
    .join("");

  emptyState.style.display = filteredProducts.length ? "none" : "block";
}

// 5. FEEDBACK AND CART COUNTER
// Small helper functions used by several controls. at the top of the screen.
let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

// Updates the small number on the shopping bag.
function updateCartCount() {
  cartCount.textContent = cartProducts.size;
  cartCount.classList.toggle("visible", cartProducts.size > 0);
}

// 6. PRODUCT ACTIONS
// One delegated listener handles clicks on all product cards. use one listener for all product cards.
productGrid.addEventListener("click", (event) => {
  const likeButton = event.target.closest("[data-like]");
  const cartButton = event.target.closest("[data-cart]");

  if (likeButton) {
    const productId = Number(likeButton.dataset.like);
    likedProducts.has(productId)
      ? likedProducts.delete(productId)
      : likedProducts.add(productId);
    renderProducts();
  }

  if (cartButton) {
    const productId = Number(cartButton.dataset.cart);
    if (cartProducts.has(productId)) {
      cartProducts.delete(productId);
      showToast("Removed from cart");
    } else {
      cartProducts.add(productId);
      showToast("Added to cart");
    }
    updateCartCount();
    renderProducts();
  }
});

// 7. SEARCH AND CATEGORY FILTERS
searchInput.addEventListener("input", renderProducts);

document.querySelectorAll(".category-button").forEach((button) => {
  button.addEventListener("click", () => {
    activeCategory = button.dataset.category;
    showOnlyLiked = false;
    document.querySelectorAll(".category-button").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
    renderProducts();
  });
});

// 8. ACCOUNT MODAL AND FORM VALIDATION
function openAccount() {
  accountBackdrop.classList.add("open");
  document.body.classList.add("modal-open");
  setTimeout(() => accountBackdrop.querySelector("input").focus(), 100);
}

function closeAccount() {
  accountBackdrop.classList.remove("open");
  document.body.classList.remove("modal-open");
}

document.querySelectorAll(".open-account").forEach((button) => {
  button.addEventListener("click", openAccount);
});

document.querySelector("#closeAccount").addEventListener("click", closeAccount);
accountBackdrop.addEventListener("click", (event) => {
  if (event.target === accountBackdrop) closeAccount();
});

document.querySelector("#accountForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const passwordInput = event.currentTarget.elements.password;
  const confirmPasswordInput = event.currentTarget.elements.confirmPassword;

  if (passwordInput.value !== confirmPasswordInput.value) {
    confirmPasswordInput.setCustomValidity("Passwords do not match");
    confirmPasswordInput.reportValidity();
    return;
  }

  event.target.reset();
  closeAccount();
  showToast("Your account is ready");
});

document
  .querySelector('[name="confirmPassword"]')
  .addEventListener("input", (event) => event.target.setCustomValidity(""));

// 9. SETTINGS PANEL
document.querySelectorAll(".open-settings").forEach((button) => {
  button.addEventListener("click", () => {
    settingsPanel.classList.toggle("open");
  });
});

document.querySelector("#closeSettings").addEventListener("click", () => {
  settingsPanel.classList.remove("open");
});

// 10. HEADER AND HERO BUTTONS
document.querySelector("#brandButton").addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

document.querySelector("#shopButton").addEventListener("click", () => {
  document.querySelector("#products").scrollIntoView({ behavior: "smooth" });
});

document.querySelector("#cartIconButton").addEventListener("click", () => {
  showToast(
    cartProducts.size
      ? `${cartProducts.size} item${cartProducts.size === 1 ? "" : "s"} in your cart`
      : "Your cart is empty",
  );
});

// 11. BOTTOM NAVIGATION ACTIONS
document.querySelectorAll(".nav-button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-button").forEach((item) => {
      item.classList.toggle("active", item === button);
    });

    const action = button.dataset.action;

    if (action === "home") {
      showOnlyLiked = false;
      renderProducts();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (action === "search") {
      showOnlyLiked = false;
      renderProducts();
      document.querySelector("#products").scrollIntoView({ behavior: "smooth" });
      setTimeout(() => searchInput.focus(), 500);
    }

    if (action === "liked") {
      showOnlyLiked = true;
      activeCategory = "All";
      document.querySelectorAll(".category-button").forEach((item) => {
        item.classList.toggle("active", item.dataset.category === "All");
      });
      renderProducts();
      document.querySelector("#products").scrollIntoView({ behavior: "smooth" });
    }

    if (action === "messages") {
      showToast("You have no new messages");
    }
  });
});

// 12. KEYBOARD ACCESSIBILITY
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAccount();
    settingsPanel.classList.remove("open");
  }
});

// 13. INITIAL PAGE RENDER
renderProducts();
