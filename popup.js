// LinkedIn Hiring Posts Filter - Popup Script

const DEFAULT_KEYWORDS = [
  'hiring', "we're hiring", 'we are hiring', 'job opening', 'job opportunity',
  'open position', 'open role', 'looking for', 'join our team', 'join my team',
  'now hiring', 'career opportunity', 'apply now', 'job alert', '#hiring',
  '#jobopening', '#opentowork', 'talent acquisition', 'recruiting',
  'remote position', 'hybrid position', 'full-time', 'part-time'
];

const filterToggle = document.getElementById('filterToggle');
const hiddenCountEl = document.getElementById('hiddenCount');
const keywordsTextarea = document.getElementById('keywords');
const saveKeywordsBtn = document.getElementById('saveKeywords');
const resetKeywordsBtn = document.getElementById('resetKeywords');
const statusEl = document.getElementById('status');

function showStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.className = 'status ' + (isError ? 'error' : 'success');
  setTimeout(() => {
    statusEl.textContent = '';
    statusEl.className = 'status';
  }, 2000);
}

function parseKeywords(text) {
  return text
    .split('\n')
    .map(k => k.trim())
    .filter(k => k.length > 0);
}

function formatKeywords(keywords) {
  return keywords.join('\n');
}

async function sendMessageToActiveTab(message) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && tab.url.includes('linkedin.com')) {
      return await chrome.tabs.sendMessage(tab.id, message);
    }
  } catch (error) {
    console.log('Could not communicate with content script:', error);
  }
  return null;
}

async function loadSettings() {
  const result = await chrome.storage.local.get(['enabled', 'keywords']);

  // Set toggle state
  filterToggle.checked = result.enabled !== false;

  // Set keywords
  const keywords = result.keywords || DEFAULT_KEYWORDS;
  keywordsTextarea.value = formatKeywords(keywords);

  // Get hidden count from content script
  const response = await sendMessageToActiveTab({ type: 'getStatus' });
  if (response) {
    hiddenCountEl.textContent = response.count || 0;
  }
}

async function toggleFilter() {
  const enabled = filterToggle.checked;

  // Save to storage
  await chrome.storage.local.set({ enabled });

  // Notify content script
  const response = await sendMessageToActiveTab({ type: 'toggle', enabled });

  if (response) {
    showStatus(enabled ? 'Filter enabled' : 'Filter disabled');
  }

  // Update count
  if (!enabled) {
    hiddenCountEl.textContent = '0';
  } else {
    setTimeout(async () => {
      const status = await sendMessageToActiveTab({ type: 'getStatus' });
      if (status) {
        hiddenCountEl.textContent = status.count || 0;
      }
    }, 200);
  }
}

async function saveKeywords() {
  const keywords = parseKeywords(keywordsTextarea.value);

  if (keywords.length === 0) {
    showStatus('Please enter at least one keyword', true);
    return;
  }

  // Save to storage
  await chrome.storage.local.set({ keywords });

  // Notify content script
  await sendMessageToActiveTab({ type: 'updateKeywords', keywords });

  showStatus('Keywords saved');

  // Update count after filtering
  setTimeout(async () => {
    const status = await sendMessageToActiveTab({ type: 'getStatus' });
    if (status) {
      hiddenCountEl.textContent = status.count || 0;
    }
  }, 300);
}

async function resetKeywords() {
  keywordsTextarea.value = formatKeywords(DEFAULT_KEYWORDS);

  // Save to storage
  await chrome.storage.local.set({ keywords: DEFAULT_KEYWORDS });

  // Notify content script
  await sendMessageToActiveTab({ type: 'updateKeywords', keywords: DEFAULT_KEYWORDS });

  showStatus('Keywords reset to default');

  // Update count after filtering
  setTimeout(async () => {
    const status = await sendMessageToActiveTab({ type: 'getStatus' });
    if (status) {
      hiddenCountEl.textContent = status.count || 0;
    }
  }, 300);
}

// Listen for count updates from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'updateCount') {
    hiddenCountEl.textContent = message.count;
  }
});

// Event listeners
filterToggle.addEventListener('change', toggleFilter);
saveKeywordsBtn.addEventListener('click', saveKeywords);
resetKeywordsBtn.addEventListener('click', resetKeywords);

// Initialize
loadSettings();
