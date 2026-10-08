document.addEventListener('DOMContentLoaded', function () {
  initNav();
  bindInternalLinks();

  if (document.getElementById('deck-container') && window.initPresentationDeck) {
    window.initPresentationDeck();
  }

  // Initial load slide in
  const wrapper = document.getElementById('page-wrapper');
  if (wrapper) {
    wrapper.classList.add('slide-in-left');
    setTimeout(function () { wrapper.classList.remove('slide-in-left'); }, 400);
  }
});

function initNav() {
  var toggle = document.getElementById('nav-toggle');
  var nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.onclick = function () {
      nav.classList.toggle('open');
      toggle.classList.toggle('open');
    };
    nav.querySelectorAll('a').forEach(function (a) {
      a.onclick = function () {
        nav.classList.remove('open');
        toggle.classList.remove('open');
      };
    });
  }
}

var isTransitioning = false;

async function navigateTo(url, pushState = true) {
  if (isTransitioning) return;
  
  // Resolve full URLs
  var targetUrl = new URL(url, window.location.href);
  var currentUrl = new URL(window.location.href);

  // Normalize pathnames (treat / and /index.html as identical)
  var targetPath = targetUrl.pathname.replace(/\/index\.html$/, '/');
  var currentPath = currentUrl.pathname.replace(/\/index\.html$/, '/');

  // If same page and same search query, do nothing
  if (targetPath === currentPath && targetUrl.search === currentUrl.search && !targetUrl.hash) {
    return;
  }

  isTransitioning = true;
  var wrapper = document.getElementById('page-wrapper');

  // 1. Slide out existing content to the right
  if (wrapper) {
    wrapper.classList.remove('slide-in-left');
    wrapper.classList.add('slide-out-right');
    await new Promise(function (resolve) { setTimeout(resolve, 180); });
  }

  try {
    var response = await fetch(url);
    if (!response.ok) throw new Error('Page fetch failed');
    var htmlText = await response.text();
    var parser = new DOMParser();
    var newDoc = parser.parseFromString(htmlText, 'text/html');

    // 2. Update page title
    document.title = newDoc.title;

    // 3. Update active nav links
    var cleanName = targetUrl.pathname.split('/').pop() || 'index.html';
    if (cleanName === '') cleanName = 'index.html';

    document.querySelectorAll('.main-nav a').forEach(function (a) {
      var aHref = (a.getAttribute('href') || '').split('/').pop();
      if (aHref === '' || aHref === '/') aHref = 'index.html';

      if (aHref === cleanName) {
        a.classList.add('active');
      } else {
        a.classList.remove('active');
      }
    });

    // 4. Update page wrapper content
    var newWrapper = newDoc.getElementById('page-wrapper');
    if (newWrapper && wrapper) {
      wrapper.innerHTML = newWrapper.innerHTML;
    } else {
      window.location.href = url;
      return;
    }

    // 5. Scroll to top
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    // 6. Update URL in address bar
    if (pushState) {
      window.history.pushState({ url: url }, '', url);
    }

    // 7. Re-apply global settings
    if (window.applySettings && window.EKAM_SETTINGS) {
      window.applySettings(window.EKAM_SETTINGS);
    }

    // Clean up presentation deck if leaving homepage
    if (cleanName !== 'index.html' && deckState && deckState.cleanup) {
      deckState.cleanup();
      deckState.cleanup = null;
    }

    // 8. Re-initialize page specific scripts
    if (cleanName === 'index.html') {
      if (window.initHomePage) window.initHomePage();
      if (window.initPresentationDeck) window.initPresentationDeck();
    } else if (cleanName === 'portfolio.html') {
      if (window.initPortfolio) window.initPortfolio();
    } else if (cleanName === 'contact.html') {
      if (window.initContactPage) window.initContactPage();
    }

    // 9. Force browser reflow and slide in new content from the left
    wrapper.classList.remove('slide-out-right');
    wrapper.classList.remove('slide-in-left');
    void wrapper.offsetWidth; // Force layout recalculation so animation restarts
    wrapper.classList.add('slide-in-left');

    setTimeout(function () {
      isTransitioning = false;
    }, 400);

    // Re-bind click handlers to newly added links
    bindInternalLinks();
  } catch (err) {
    console.error('Transition error:', err);
    window.location.href = url;
  }
}

function bindInternalLinks() {
  document.querySelectorAll('a[href]').forEach(function (link) {
    if (link.dataset.bound) return;
    link.dataset.bound = 'true';

    link.addEventListener('click', function (e) {
      var href = link.getAttribute('href');

      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:') ||
        link.target === '_blank' ||
        e.metaKey || e.ctrlKey || e.shiftKey || e.altKey
      ) {
        return;
      }

      var isInternal = !href.startsWith('http://') && !href.startsWith('https://') ||
                       href.includes(window.location.hostname);

      if (isInternal) {
        e.preventDefault();
        navigateTo(href, true);
      }
    });
  });
}

// Support browser Back / Forward buttons
window.addEventListener('popstate', function () {
  navigateTo(window.location.href, false);
});

/* =========================================================
   PRESENTATION DECK CONTROLLER (HOMEPAGE)
   ========================================================= */
var deckState = {
  active: false,
  currentIndex: 0,
  isLocked: false,
  lockTimeout: null,
  cleanup: null
};

window.initPresentationDeck = function () {
  // Clean up any previous deck listeners
  if (deckState.cleanup) {
    deckState.cleanup();
    deckState.cleanup = null;
  }

  var container = document.getElementById('deck-container');
  if (!container) return;

  var slides = Array.from(container.querySelectorAll('.deck-slide'));
  if (slides.length === 0) return;

  var dots = Array.from(document.querySelectorAll('.deck-dot'));
  var progressBar = document.getElementById('deck-progress-bar');
  var total = slides.length;

  deckState.active = true;
  deckState.currentIndex = 0;
  deckState.isLocked = false;

  function updateHUD(index) {
    deckState.currentIndex = index;

    // Update dots
    dots.forEach(function (dot, i) {
      if (i === index) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

    // Update Progress Bar
    if (progressBar) {
      progressBar.style.width = ((index + 1) / total * 100) + '%';
    }

    // Trigger reveal animations
    slides.forEach(function (slide, i) {
      if (i === index) {
        slide.classList.add('is-active');
      }
    });
  }

  function goToSlide(targetIndex) {
    if (targetIndex < 0) targetIndex = 0;
    if (targetIndex >= total) targetIndex = total - 1;

    deckState.currentIndex = targetIndex;
    deckState.isLocked = true;
    clearTimeout(deckState.lockTimeout);

    updateHUD(targetIndex);

    // Keep window strictly pinned at top so sticky header never shakes
    if (window.scrollY !== 0) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }

    var targetOffset = slides[targetIndex].offsetTop;
    container.scrollTo({
      top: targetOffset,
      behavior: 'smooth'
    });

    deckState.lockTimeout = setTimeout(function () {
      deckState.isLocked = false;
    }, 750);
  }

  window.deckGoToSlide = goToSlide;

  // Dot Click Handlers
  dots.forEach(function (dot) {
    dot.onclick = function (e) {
      e.preventDefault();
      var idx = parseInt(dot.getAttribute('data-slide'), 10);
      if (!isNaN(idx)) {
        goToSlide(idx);
      }
    };
  });

  // Trackpad Momentum & Wheel Gesture Controller
  var isMomentumActive = false;
  var wheelIdleTimer = null;
  var accumulatedDelta = 0;
  var recentDeltas = [];

  function onWheel(e) {
    if (!deckState.active) return;

    // Prevent default native scroll/bounce on the deck to avoid jitter
    e.preventDefault();

    var deltaY = e.deltaY;

    // Normalize deltaMode (e.g. Firefox line mode)
    if (e.deltaMode === 1) {
      deltaY *= 33;
    } else if (e.deltaMode === 2) {
      deltaY *= 100;
    }

    // Ignore horizontal trackpad swipes
    if (Math.abs(e.deltaX) > Math.abs(deltaY)) return;

    var absDelta = Math.abs(deltaY);
    recentDeltas.push(absDelta);
    if (recentDeltas.length > 6) recentDeltas.shift();

    // Reset idle timer whenever any wheel event arrives
    clearTimeout(wheelIdleTimer);
    wheelIdleTimer = setTimeout(function () {
      isMomentumActive = false;
      accumulatedDelta = 0;
      recentDeltas = [];
    }, 180);

    // If slide transition is currently animating, ignore event
    if (deckState.isLocked) {
      return;
    }

    // If trackpad inertia momentum is still decaying from previous swipe
    if (isMomentumActive) {
      // Check if user initiated a deliberate new swipe (sudden surge in delta)
      var avgRecent = recentDeltas.length > 2
        ? (recentDeltas.slice(0, -1).reduce(function (a, b) { return a + b; }, 0) / (recentDeltas.length - 1))
        : 0;

      var isSurge = absDelta > 30 && absDelta > avgRecent * 1.8;

      if (!isSurge) {
        // Trailing inertia from previous swipe — ignore
        return;
      }
    }

    // Accumulate deltas to filter out accidental trackpad brush/drift
    accumulatedDelta += deltaY;

    var THRESHOLD = 24;

    if (Math.abs(accumulatedDelta) >= THRESHOLD) {
      var direction = accumulatedDelta > 0 ? 1 : -1;
      accumulatedDelta = 0;

      if (direction > 0 && deckState.currentIndex < total - 1) {
        isMomentumActive = true;
        goToSlide(deckState.currentIndex + 1);
      } else if (direction < 0 && deckState.currentIndex > 0) {
        isMomentumActive = true;
        goToSlide(deckState.currentIndex - 1);
      }
    }
  }

  // Touch Gesture Handlers for Mobile & Tablets
  var touchStartY = 0;
  var touchStartX = 0;

  function onTouchStart(e) {
    if (e.touches.length === 1) {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
    }
  }

  function onTouchEnd(e) {
    if (deckState.isLocked) return;
    if (!e.changedTouches || e.changedTouches.length === 0) return;

    var touchEndY = e.changedTouches[0].clientY;
    var touchEndX = e.changedTouches[0].clientX;
    var deltaY = touchStartY - touchEndY;
    var deltaX = touchStartX - touchEndX;

    // Ensure vertical swipe is dominant
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 38) {
      if (deltaY > 0 && deckState.currentIndex < total - 1) {
        goToSlide(deckState.currentIndex + 1);
      } else if (deltaY < 0 && deckState.currentIndex > 0) {
        goToSlide(deckState.currentIndex - 1);
      }
    }
  }

  // Keyboard Navigation
  function onKeyDown(e) {
    if (!deckState.active) return;

    // Ignore if typing in an input or textarea
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      if (deckState.currentIndex < total - 1) {
        e.preventDefault();
        goToSlide(deckState.currentIndex + 1);
      }
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      if (deckState.currentIndex > 0) {
        e.preventDefault();
        goToSlide(deckState.currentIndex - 1);
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      goToSlide(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      goToSlide(total - 1);
    }
  }

  // Keep active slide perfectly aligned on window resize
  function onResize() {
    if (deckState.active && slides[deckState.currentIndex]) {
      container.scrollTo({
        top: slides[deckState.currentIndex].offsetTop,
        behavior: 'instant'
      });
    }
  }

  // IntersectionObserver to keep HUD and animations updated if user scrolls naturally
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var idx = parseInt(entry.target.getAttribute('data-index'), 10);
        if (!isNaN(idx) && !deckState.isLocked) {
          updateHUD(idx);
        }
      }
    });
  }, {
    root: container,
    threshold: 0.55
  });

  slides.forEach(function (slide) {
    observer.observe(slide);
  });

  window.addEventListener('wheel', onWheel, { passive: false });
  container.addEventListener('touchstart', onTouchStart, { passive: true });
  container.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', onResize);

  // Initial HUD update
  updateHUD(0);

  // Store cleanup
  deckState.cleanup = function () {
    deckState.active = false;
    clearTimeout(deckState.lockTimeout);
    clearTimeout(wheelIdleTimer);
    observer.disconnect();
    window.removeEventListener('wheel', onWheel);
    container.removeEventListener('touchstart', onTouchStart);
    container.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('resize', onResize);
    delete window.deckGoToSlide;
  };
};

