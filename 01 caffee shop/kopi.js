document.addEventListener('DOMContentLoaded', () => {

  /* =========================================================
     Tahun footer otomatis
     ========================================================= */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* =========================================================
     Header: efek scroll + toggle nav mobile
     ========================================================= */
  const header = document.getElementById('header');
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');

  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  navToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('open');
    navToggle.classList.toggle('active', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  // Tutup nav mobile saat link diklik
  mainNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('open');
      navToggle.classList.remove('active');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  /* =========================================================
     KERANJANG PESANAN
     Sederhana dan mudah dipahami:
     - Klik "Tambah" pada menu -> item masuk ke keranjang (tersimpan di
       browser, jadi tidak hilang meski halaman di-refresh).
     - Klik dua kali menu yang sama -> jumlahnya otomatis bertambah.
     - Buka ikon keranjang di pojok kanan bawah untuk lihat & atur pesanan.
     - Tombol "Pesan via WhatsApp" menyusun pesan otomatis lalu membuka WA.
     ========================================================= */
  const CART_KEY = 'stup_cart';
  const WHATSAPP_NUMBER = '6282221988244';

  // Aturan minimal pesanan per metode pengantaran
  const MIN_ORDER = { cod: 5, tf: 8 };
  const PAYMENT_LABEL = { cod: 'COD (Cash on Delivery)', tf: 'Transfer Bank' };

  let cart = [];
  try {
    cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) {
    cart = [];
  }

  const cartToggle = document.getElementById('cartToggle');
  const cartOverlay = document.getElementById('cartOverlay');
  const cartDrawer = document.getElementById('cartDrawer');
  const cartClose = document.getElementById('cartClose');
  const cartCountEl = document.getElementById('cartCount');
  const cartItemsEl = document.getElementById('cartItems');
  const cartTotalEl = document.getElementById('cartTotal');
  const cartCheckoutBtn = document.getElementById('cartCheckout');
  const cartPaymentWarning = document.getElementById('cartPaymentWarning');
  const paymentInputs = document.querySelectorAll('input[name="paymentMethod"]');

  function getSelectedPayment() {
    const checked = document.querySelector('input[name="paymentMethod"]:checked');
    return checked ? checked.value : 'cod';
  }

  // Ubah angka jadi format Rupiah, mis. 20000 -> "Rp 20.000"
  function formatRupiah(number) {
    return 'Rp ' + number.toLocaleString('id-ID');
  }

  function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function totalItemCount() {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }

  function totalPrice() {
    return cart.reduce((sum, item) => sum + item.qty * item.price, 0);
  }

  // Menampilkan ulang isi keranjang ke layar setiap kali ada perubahan
  function renderCart() {
    const count = totalItemCount();
    cartCountEl.textContent = count;
    cartCountEl.style.display = count > 0 ? 'flex' : 'none';

    if (cart.length === 0) {
      cartItemsEl.innerHTML = '<p class="cart-empty">Keranjang masih kosong. Yuk pilih menu favoritmu!</p>';
    } else {
      cartItemsEl.innerHTML = cart.map(item => `
        <div class="cart-item">
          <button class="cart-item-remove" data-action="remove" data-name="${item.name}" aria-label="Batalkan ${item.name}">&times;</button>
          <div class="cart-item-info">
            <p class="cart-item-name">${item.name}</p>
            <p class="cart-item-price">${formatRupiah(item.price)} × ${item.qty} = ${formatRupiah(item.price * item.qty)}</p>
          </div>
          <div class="cart-item-actions">
            <button class="qty-btn" data-action="minus" data-name="${item.name}" aria-label="Kurangi ${item.name}">−</button>
            <span class="qty-num">${item.qty}</span>
            <button class="qty-btn" data-action="plus" data-name="${item.name}" aria-label="Tambah ${item.name}">+</button>
          </div>
        </div>
      `).join('');
    }

    cartTotalEl.textContent = formatRupiah(totalPrice());
    updateCheckoutState();
  }

  // Cek apakah jumlah pesanan sudah memenuhi minimal sesuai metode yang dipilih
  function updateCheckoutState() {
    const count = totalItemCount();
    const method = getSelectedPayment();
    const minRequired = MIN_ORDER[method];

    if (cart.length === 0) {
      cartPaymentWarning.classList.remove('show');
      cartCheckoutBtn.disabled = true;
      return;
    }

    if (count < minRequired) {
      const methodName = method === 'cod' ? 'COD' : 'Transfer';
      cartPaymentWarning.textContent = `Pesanan ${methodName} minimal ${minRequired} item. Kamu baru pilih ${count} item, tambah ${minRequired - count} lagi ya.`;
      cartPaymentWarning.classList.add('show');
      cartCheckoutBtn.disabled = true;
    } else {
      cartPaymentWarning.classList.remove('show');
      cartCheckoutBtn.disabled = false;
    }
  }

  function addToCart(name, price) {
    const existing = cart.find(item => item.name === name);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ name, price, qty: 1 });
    }
    saveCart();
    renderCart();

    // Efek "pantul" kecil pada ikon keranjang agar terasa responsif
    cartToggle.classList.remove('bump');
    void cartToggle.offsetWidth; // reset animasi
    cartToggle.classList.add('bump');
  }

  function changeQty(name, delta) {
    const item = cart.find(i => i.name === name);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
      cart = cart.filter(i => i.name !== name);
    }
    saveCart();
    renderCart();
  }

  // Batalkan/hapus satu menu dari keranjang, berapapun jumlahnya
  function removeFromCart(name) {
    cart = cart.filter(i => i.name !== name);
    saveCart();
    renderCart();
  }

  // Tombol "Tambah" pada tiap kartu menu
  document.querySelectorAll('.btn-add').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.dataset.item || 'Menu';
      const price = parseInt(btn.dataset.price, 10) || 0;

      addToCart(item, price);

      // Feedback singkat di tombolnya sendiri
      const original = btn.textContent;
      btn.textContent = 'Ditambahkan ✓';
      btn.classList.add('added');
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('added');
        btn.disabled = false;
      }, 1200);
    });
  });

  // Tombol +/- dan tombol batal (×) di dalam panel keranjang (event delegation)
  cartItemsEl.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.cart-item-remove');
    if (removeBtn) {
      removeFromCart(removeBtn.dataset.name);
      return;
    }
    const qtyBtn = e.target.closest('.qty-btn');
    if (qtyBtn) {
      const delta = qtyBtn.dataset.action === 'plus' ? 1 : -1;
      changeQty(qtyBtn.dataset.name, delta);
    }
  });

  // Buka / tutup panel keranjang
  function openCart() {
    cartDrawer.classList.add('active');
    cartOverlay.classList.add('active');
    cartDrawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open'); // kunci scroll halaman
  }
  function closeCart() {
    cartDrawer.classList.remove('active');
    cartOverlay.classList.remove('active');
    cartDrawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
  }

  // Cek ulang syarat minimal setiap kali pelanggan ganti metode COD/Transfer
  paymentInputs.forEach(input => {
    input.addEventListener('change', updateCheckoutState);
  });

  cartToggle.addEventListener('click', openCart);
  cartClose.addEventListener('click', closeCart);
  cartOverlay.addEventListener('click', closeCart);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cartDrawer.classList.contains('active')) closeCart();
  });

  // Susun pesan WhatsApp otomatis dari isi keranjang
  function buildWhatsAppMessage() {
    const method = getSelectedPayment();
    const lines = ['Halo Stup, saya mau pesan:', ''];
    cart.forEach(item => {
      lines.push(`- ${item.name} x${item.qty} = ${formatRupiah(item.price * item.qty)}`);
    });
    lines.push('');
    lines.push(`Total: ${formatRupiah(totalPrice())}`);
    lines.push(`Metode: ${PAYMENT_LABEL[method]}`);
    lines.push('');
    lines.push('Mohon info untuk proses selanjutnya ya. Terima kasih!');
    return lines.join('\n');
  }

  cartCheckoutBtn.addEventListener('click', () => {
    if (cart.length === 0) return;
    const message = encodeURIComponent(buildWhatsAppMessage());
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
  });

  // Tampilkan keranjang saat halaman dibuka (jika sebelumnya sudah ada isi)
  renderCart();

  /* =========================================================
     SLIDER GENERIK — drag mouse, swipe touch (native),
     tombol panah, keyboard, dan dot indikator (opsional).
     Dipakai untuk slider Menu dan slider Galeri.
     ========================================================= */
  function initDragSlider({ track, prevBtn, nextBtn, dotsWrap, onItemClick }) {
    if (!track) return null;

    const items = Array.from(track.children);

    // --- Dot indikator (opsional, hanya dipasang jika dotsWrap ada) ---
    let dots = [];
    if (dotsWrap) {
      items.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.classList.add('dot');
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => {
          items[i].scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
        });
        dotsWrap.appendChild(dot);
      });
      dots = Array.from(dotsWrap.children);
    }

    function getScrollStep() {
      const item = items[0];
      const style = window.getComputedStyle(track);
      const gap = parseFloat(style.columnGap || style.gap || 22);
      return item.getBoundingClientRect().width + gap;
    }

    function updateArrowState() {
      if (!prevBtn || !nextBtn) return;
      const maxScroll = track.scrollWidth - track.clientWidth - 2;
      prevBtn.disabled = track.scrollLeft <= 2;
      nextBtn.disabled = track.scrollLeft >= maxScroll;
    }

    function updateActiveDot() {
      if (!dots.length) return;
      let closestIndex = 0;
      let closestDist = Infinity;
      items.forEach((item, i) => {
        const dist = Math.abs(item.offsetLeft - track.scrollLeft);
        if (dist < closestDist) { closestDist = dist; closestIndex = i; }
      });
      dots.forEach((d, i) => d.classList.toggle('active', i === closestIndex));
    }

    // --- Tombol panah ---
    if (nextBtn) nextBtn.addEventListener('click', () => {
      track.scrollBy({ left: getScrollStep(), behavior: 'smooth' });
    });
    if (prevBtn) prevBtn.addEventListener('click', () => {
      track.scrollBy({ left: -getScrollStep(), behavior: 'smooth' });
    });

    // --- Drag dengan mouse (desktop) ---
    let isDown = false;
    let startX = 0;
    let scrollStart = 0;
    let hasDragged = false;

    track.addEventListener('mousedown', (e) => {
      isDown = true;
      hasDragged = false;
      track.classList.add('dragging');
      startX = e.pageX;
      scrollStart = track.scrollLeft;
    });

    window.addEventListener('mouseup', () => {
      isDown = false;
      track.classList.remove('dragging');
    });

    window.addEventListener('mouseleave', () => {
      isDown = false;
      track.classList.remove('dragging');
    });

    track.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const dx = e.pageX - startX;
      if (Math.abs(dx) > 5) hasDragged = true;
      track.scrollLeft = scrollStart - dx;
    });

    // Klik item (mis. buka lightbox) — dicegah jika baru saja drag
    track.addEventListener('click', (e) => {
      if (hasDragged) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (onItemClick) {
        const item = e.target.closest(':scope > *');
        if (item && track.contains(item)) onItemClick(item, e);
      }
    }, true);

    // --- Touch (mobile): overflow-x + scroll-snap native sudah cukup mulus ---

    // --- Update state saat scroll ---
    let scrollTimeout;
    track.addEventListener('scroll', () => {
      updateArrowState();
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(updateActiveDot, 80);
    }, { passive: true });

    // Keyboard accessibility (panah kiri/kanan saat track difokuskan)
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { track.scrollBy({ left: getScrollStep(), behavior: 'smooth' }); }
      if (e.key === 'ArrowLeft') { track.scrollBy({ left: -getScrollStep(), behavior: 'smooth' }); }
    });

    // Init
    updateArrowState();
    updateActiveDot();
    window.addEventListener('resize', updateArrowState);

    return { updateArrowState, updateActiveDot };
  }

  /* --- Slider Menu (dengan dot indikator) --- */
  initDragSlider({
    track: document.getElementById('sliderTrack'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    dotsWrap: document.getElementById('sliderDots'),
  });

  /* =========================================================
     GALERI — slider drag/swipe + Lightbox
     ========================================================= */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxClose = document.getElementById('lightboxClose');

  function openLightbox(src, alt) {
    lightboxImg.src = src.replace(/w=\d+/, 'w=1600');
    lightboxImg.alt = alt || '';
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
  }

  /* --- Slider Galeri (tanpa dot, foto lebih besar) --- */
  initDragSlider({
    track: document.getElementById('galleryTrack'),
    prevBtn: document.getElementById('galleryPrevBtn'),
    nextBtn: document.getElementById('galleryNextBtn'),
    onItemClick: (item) => {
      if (item.tagName === 'IMG') openLightbox(item.src, item.alt);
    },
  });

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);

  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox && lightbox.classList.contains('active')) {
      closeLightbox();
    }
  });

  /* =========================================================
     BERI NILAI (Rating Bintang)
     - Pelanggan ketuk bintang 1-5 untuk memberi nilai.
     - Nilai tersimpan di browser (localStorage), rata-rata dan
       jumlah penilaian dihitung otomatis dan langsung update
       di section "Beri Nilai" maupun di hero bagian atas.
     - Satu browser hanya bisa menilai sekali, supaya adil.
 */
  const RATINGS_KEY = 'stup_ratings';       // menyimpan semua nilai yang masuk
  const MY_RATING_KEY = 'stup_my_rating';   // nilai yang diberikan pengguna ini
  const HAS_RATED_KEY = 'stup_has_rated';

  let ratings = [];
  try {
    ratings = JSON.parse(localStorage.getItem(RATINGS_KEY)) || [];
  } catch (e) {
    ratings = [];
  }
  let hasRated = localStorage.getItem(HAS_RATED_KEY) === 'true';

  const starButtons = document.querySelectorAll('.star-btn');
  const ratingFeedback = document.getElementById('ratingFeedback');
  const ratingScoreEl = document.getElementById('ratingScore');
  const heroRatingText = document.getElementById('heroRatingText');

  function fillStars(count) {
    starButtons.forEach(btn => {
      const value = parseInt(btn.dataset.value, 10);
      btn.classList.toggle('filled', value <= count);
    });
  }

  function renderRatingSummary() {
    if (ratings.length === 0) {
      if (ratingScoreEl) ratingScoreEl.textContent = 'Belum ada penilaian';
      if (heroRatingText) heroRatingText.textContent = 'Belum ada penilaian';
      return;
    }
    const average = ratings.reduce((sum, n) => sum + n, 0) / ratings.length;
    const averageText = average.toFixed(1);
    if (ratingScoreEl) {
      ratingScoreEl.textContent = `${averageText}/5 dari ${ratings.length} penilaian`;
    }
    if (heroRatingText) {
      heroRatingText.innerHTML = `<strong>${averageText}/5</strong> dari ${ratings.length} penilaian`;
    }
  }

  if (starButtons.length) {
    // Jika pengguna ini sudah pernah menilai, tampilkan nilainya & kunci tombol
    if (hasRated) {
      const myRating = parseInt(localStorage.getItem(MY_RATING_KEY), 10) || 0;
      fillStars(myRating);
      ratingFeedback.textContent = 'Terima kasih, kamu sudah memberi nilai. Sampai jumpa lagi di Stup!';
      starButtons.forEach(btn => btn.disabled = true);
    }

    starButtons.forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        if (hasRated) return;
        fillStars(parseInt(btn.dataset.value, 10));
      });
      btn.addEventListener('mouseleave', () => {
        if (hasRated) return;
        fillStars(0);
      });
      btn.addEventListener('click', () => {
        if (hasRated) return;
        const value = parseInt(btn.dataset.value, 10);

        ratings.push(value);
        localStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
        localStorage.setItem(MY_RATING_KEY, value);
        localStorage.setItem(HAS_RATED_KEY, 'true');
        hasRated = true;

        fillStars(value);
        starButtons.forEach(b => b.disabled = true);
        ratingFeedback.textContent = 'Terima kasih atas penilaiannya! ⭐';
        renderRatingSummary();
      });
    });
  }

  renderRatingSummary();

  /*Reveal animasi ringan saat elemen masuk viewport*/
  const revealTargets = document.querySelectorAll('.value-card, .location-info, .location-map');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    revealTargets.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
      el.style.transition = 'opacity 0.7s cubic-bezier(.22,1,.36,1), transform 0.7s cubic-bezier(.22,1,.36,1)';
      observer.observe(el);
    });
  }

});