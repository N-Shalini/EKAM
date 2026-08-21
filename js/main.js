document.addEventListener('DOMContentLoaded', function () {
  initNav();
  bindInternalLinks();

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

    // 8. Re-initialize page specific scripts
    if (cleanName === 'index.html') {
      if (window.initHomePage) window.initHomePage();
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
