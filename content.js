// LinkedIn Hiring Posts Filter - Content Script
// Set to true to enable debug logging
const DEBUG = false;

function log(...args) {
  if (DEBUG) console.log('[LHF]', ...args);
}

const DEFAULT_KEYWORDS = [
  'hiring', "we're hiring", 'we are hiring', 'job opening', 'job opportunity',
  'open position', 'open role', 'looking for', 'join our team', 'join my team',
  'now hiring', 'career opportunity', 'apply now', 'job alert', '#hiring',
  '#jobopening', '#opentowork', 'talent acquisition', 'recruiting',
  'remote position', 'hybrid position', 'full-time', 'part-time'
];

let isEnabled = true;
let keywords = DEFAULT_KEYWORDS;
let hiddenCount = 0;

// LinkedIn now uses hashed CSS class names (CSS-in-JS), so we can't rely on class selectors
// Instead, we use structural detection based on element patterns

function getPostSelector() {
  return [
    '[data-id^="urn:li:activity"]',
    '[data-urn^="urn:li:activity"]',
    '[data-id*="activity"]'
  ].join(', ');
}

// Structural detection: LinkedIn posts have specific patterns regardless of class names
function findPostsFallback() {
  const posts = [];
  const seenElements = new Set();

  function addUnique(el) {
    if (el && !seenElements.has(el)) {
      for (const existing of posts) {
        if (existing.contains(el) || el.contains(existing)) {
          return;
        }
      }
      seenElements.add(el);
      posts.push(el);
    }
  }

  function looksLikeSinglePost(el) {
    if (!el) return false;
    const textLen = el.textContent.length;
    if (textLen < 150 || textLen > 4000) return false;
    if (el.textContent.includes('Start a post') && el.textContent.includes('Sort by:')) {
      return false;
    }
    const profileLinks = el.querySelectorAll('a[href*="/in/"]');
    const reactButtons = el.querySelectorAll('button[aria-label*="React"]');
    return profileLinks.length >= 1 && profileLinks.length <= 5 && reactButtons.length === 1;
  }

  // Method 1: Find React buttons and walk up to find individual post containers
  document.querySelectorAll('main button[aria-label*="React"]').forEach(btn => {
    let container = btn.parentElement;
    let bestCandidate = null;

    for (let i = 0; i < 12 && container; i++) {
      const textLen = container.textContent.length;
      if (textLen > 4000) break;

      if (textLen > 150) {
        const hasProfileLink = container.querySelector('a[href*="/in/"]');
        const hasImage = container.querySelector('img');
        const reactCount = container.querySelectorAll('button[aria-label*="React"]').length;

        if (hasProfileLink && hasImage && reactCount === 1) {
          bestCandidate = container;
        }
      }
      container = container.parentElement;
    }

    if (bestCandidate) {
      addUnique(bestCandidate);
    }
  });

  // Method 2: If no React buttons found, try finding posts via profile images
  if (posts.length === 0) {
    document.querySelectorAll('main img[src*="licdn.com/dms/image"]').forEach(img => {
      let container = img.parentElement;
      for (let i = 0; i < 10 && container; i++) {
        if (looksLikeSinglePost(container)) {
          addUnique(container);
          break;
        }
        container = container.parentElement;
      }
    });
  }

  // Method 3: Score-based approach for posts
  if (posts.length === 0) {
    const mainEl = document.querySelector('main');
    if (mainEl) {
      const allDivs = mainEl.querySelectorAll('div');
      const candidatePosts = [];

      allDivs.forEach(div => {
        const textLen = div.textContent.length;
        if (textLen > 150 && textLen < 3000) {
          if (div.textContent.includes('Start a post') && div.textContent.includes('Sort by:')) {
            return;
          }
          const imgs = div.querySelectorAll('img').length;
          const reactBtns = div.querySelectorAll('button[aria-label*="React"]').length;
          const profileLinks = div.querySelectorAll('a[href*="/in/"]').length;

          if (reactBtns === 1 && imgs >= 1 && profileLinks >= 1) {
            candidatePosts.push({ el: div, textLen });
          }
        }
      });

      candidatePosts
        .sort((a, b) => a.textLen - b.textLen)
        .forEach(({ el }) => addUnique(el));
    }
  }

  log('Fallback found elements:', posts.length);
  return posts;
}

function containsHiringKeyword(text) {
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

function getPostTextContent(post) {
  return post.textContent || '';
}

function processPost(post) {
  if (!isEnabled) {
    post.classList.remove('lhf-hidden');
    return false;
  }

  const alreadyProcessed = post.dataset.lhfProcessed === 'true' && post.dataset.lhfEnabled === String(isEnabled);

  if (alreadyProcessed) {
    return post.classList.contains('lhf-hidden');
  }

  const text = getPostTextContent(post);
  const isHiringPost = containsHiringKeyword(text);

  if (isHiringPost) {
    post.classList.remove('lhf-hidden');
  } else {
    post.classList.add('lhf-hidden');
  }

  post.dataset.lhfProcessed = 'true';
  post.dataset.lhfEnabled = String(isEnabled);
  return !isHiringPost;
}

function filterPosts() {
  hiddenCount = 0;
  let posts = document.querySelectorAll(getPostSelector());

  if (posts.length === 0) {
    posts = findPostsFallback();
  }

  posts.forEach(post => {
    if (processPost(post)) {
      hiddenCount++;
    }
  });

  log('Total posts:', posts.length, '| Hidden:', hiddenCount);

  chrome.runtime.sendMessage({ type: 'updateCount', count: hiddenCount }).catch(() => {});
}

function resetFilter() {
  let posts = document.querySelectorAll(getPostSelector());
  if (posts.length === 0) {
    posts = findPostsFallback();
  }
  posts.forEach(post => {
    post.classList.remove('lhf-hidden');
    post.dataset.lhfProcessed = 'false';
  });

  document.querySelectorAll('.lhf-hidden').forEach(el => {
    el.classList.remove('lhf-hidden');
  });

  hiddenCount = 0;
}

function loadSettings() {
  chrome.storage.local.get(['enabled', 'keywords'], (result) => {
    isEnabled = result.enabled !== false;
    keywords = result.keywords || DEFAULT_KEYWORDS;
    filterPosts();
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'toggle') {
    isEnabled = message.enabled;
    if (isEnabled) {
      filterPosts();
    } else {
      resetFilter();
    }
    sendResponse({ success: true });
  } else if (message.type === 'updateKeywords') {
    keywords = message.keywords;
    resetFilter();
    if (isEnabled) {
      filterPosts();
    }
    sendResponse({ success: true });
  } else if (message.type === 'getCount') {
    sendResponse({ count: hiddenCount });
  } else if (message.type === 'getStatus') {
    sendResponse({ enabled: isEnabled, count: hiddenCount });
  }
  return true;
});

// MutationObserver with throttling
let lastFilterTime = 0;
const FILTER_THROTTLE = 2000; // Only filter once per 2 seconds max

const observer = new MutationObserver((mutations) => {
  if (!isEnabled) return;

  let hasNewNodes = false;
  for (const mutation of mutations) {
    if (mutation.addedNodes.length > 0) {
      hasNewNodes = true;
      break;
    }
  }

  if (!hasNewNodes) return;

  const now = Date.now();
  clearTimeout(window.lhfFilterTimeout);

  const delay = (now - lastFilterTime < FILTER_THROTTLE) ? FILTER_THROTTLE : 500;
  window.lhfFilterTimeout = setTimeout(() => {
    lastFilterTime = Date.now();
    filterPosts();
  }, delay);
});

function startObserver() {
  const feedContainer = document.querySelector('main') || document.body;
  observer.observe(feedContainer, {
    childList: true,
    subtree: true
  });
}

function init() {
  log('LinkedIn Hiring Filter initializing...');

  loadSettings();
  startObserver();

  // Retry filtering a few times for dynamic content
  [1000, 3000].forEach(delay => {
    setTimeout(() => {
      if (isEnabled) filterPosts();
    }, delay);
  });

  // Handle SPA navigation
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(filterPosts, 1000);
    }
  }).observe(document, { subtree: true, childList: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
