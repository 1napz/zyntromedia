/**
 * Tests for poe-ai-platform-1.html JavaScript functions.
 *
 * Strategy: extract the script content from the HTML file, inject the
 * required DOM structure into jsdom, then evaluate the script so that
 * all functions/state are available on `window`.
 */

const fs = require('fs');
const path = require('path');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractScript(html) {
  const match = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
  if (!match) throw new Error('Could not locate inline <script> block');
  return match[1];
}

function buildDOM() {
  // Minimal DOM structure required by the scripts
  document.body.innerHTML = `
    <!-- Nav mock-mode controls -->
    <button id="mock-btn" class="bg-white">
      <i id="mock-icon" class="fas fa-toggle-off"></i>
      <span id="mock-status">Mock Mode: OFF</span>
    </button>

    <!-- Hero counters -->
    <div id="live-models">0</div>
    <div id="live-tokens">0</div>
    <div id="live-users">0</div>

    <!-- Chat demo -->
    <div id="chat-demo">
      <div id="chat-messages"></div>
      <input id="chat-input" type="text" />
    </div>

    <!-- Models section -->
    <div id="models-grid"></div>

    <!-- Pricing section -->
    <div id="pricing-cards"></div>
    <button class="billing-btn active" data-period="month">Monthly</button>
    <button class="billing-btn text-zinc-400" data-period="year">Yearly</button>

    <!-- Cost optimizer -->
    <input id="call-slider" type="range" min="100" max="10000" value="1200" />
    <span id="call-value">1,200</span>
    <div id="poe-cost">$12.36</div>
    <div id="openai-cost">$89</div>
    <select id="tier-select">
      <option value="Standard">Standard</option>
      <option value="Premium">Premium</option>
      <option value="God">God</option>
    </select>
    <div id="token-stats"></div>

    <!-- Regen section -->
    <div id="regen-balance">1,248,932</div>
    <div id="regen-progress" style="width:78%"></div>
  `;
}

// ─── Module-level setup ──────────────────────────────────────────────────────

let scriptSrc;

beforeAll(() => {
  const htmlPath = path.join(__dirname, '..', 'poe-ai-platform-1.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  scriptSrc = extractScript(html);
});

beforeEach(() => {
  // Rebuild DOM and re-evaluate script before each test so state is isolated
  buildDOM();

  // Remove any toasts from previous tests
  document.querySelectorAll('.fixed').forEach(el => el.remove());

  // Use indirect eval so function declarations become globals on window
  // eslint-disable-next-line no-eval
  (0, eval)(scriptSrc);
});

// ─── animateCounter ──────────────────────────────────────────────────────────

describe('animateCounter', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('initialises element text to a non-zero value after first interval', () => {
    window.animateCounter('live-models', 247);
    jest.advanceTimersByTime(16);
    const val = parseInt(document.getElementById('live-models').textContent.replace(/,/g, ''));
    expect(val).toBeGreaterThan(0);
  });

  test('reaches exact target after full duration', () => {
    window.animateCounter('live-models', 247, 2000);
    jest.runAllTimers();
    const val = parseInt(document.getElementById('live-models').textContent.replace(/,/g, ''));
    expect(val).toBe(247);
  });

  test('formats large numbers with locale commas', () => {
    window.animateCounter('live-tokens', 1248932, 2000);
    jest.runAllTimers();
    const text = document.getElementById('live-tokens').textContent;
    expect(text).toContain(',');
    expect(parseInt(text.replace(/,/g, ''))).toBe(1248932);
  });

  test('does not exceed target value', () => {
    window.animateCounter('live-users', 18420, 2000);
    jest.runAllTimers();
    const val = parseInt(document.getElementById('live-users').textContent.replace(/,/g, ''));
    expect(val).toBeLessThanOrEqual(18420);
    expect(val).toBe(18420);
  });

  test('handles target of zero gracefully', () => {
    window.animateCounter('live-models', 0, 2000);
    jest.runAllTimers();
    // target is 0 — step will be 0 and start never advances; textContent should be "0"
    const text = document.getElementById('live-models').textContent;
    expect(text).toBe('0');
  });
});

// ─── renderModels ─────────────────────────────────────────────────────────────

describe('renderModels', () => {
  test('renders exactly 4 model cards', () => {
    window.renderModels();
    const cards = document.getElementById('models-grid').children;
    expect(cards.length).toBe(4);
  });

  test('renders GPT-5 card with correct provider', () => {
    window.renderModels();
    const html = document.getElementById('models-grid').innerHTML;
    expect(html).toContain('GPT-5');
    expect(html).toContain('OpenAI');
  });

  test('renders Claude 4.5 card with 1M context', () => {
    window.renderModels();
    const html = document.getElementById('models-grid').innerHTML;
    expect(html).toContain('Claude 4.5');
    expect(html).toContain('1M');
  });

  test('renders Llama 4 card with emoji icon', () => {
    window.renderModels();
    const html = document.getElementById('models-grid').innerHTML;
    expect(html).toContain('Llama 4');
    expect(html).toContain('🦙');
  });

  test('renders Gemini 2.5 card with Google provider', () => {
    window.renderModels();
    const html = document.getElementById('models-grid').innerHTML;
    expect(html).toContain('Gemini 2.5');
    expect(html).toContain('Google');
  });

  test('each card contains a context label', () => {
    window.renderModels();
    const html = document.getElementById('models-grid').innerHTML;
    // "Context" label should appear once per card
    const occurrences = (html.match(/Context/g) || []).length;
    expect(occurrences).toBe(4);
  });
});

// ─── renderPricing ────────────────────────────────────────────────────────────

describe('renderPricing', () => {
  test('renders 6 pricing tier cards', () => {
    window.renderPricing();
    const cards = document.getElementById('pricing-cards').children;
    expect(cards.length).toBe(6);
  });

  test('Free tier shows $0', () => {
    window.renderPricing();
    const html = document.getElementById('pricing-cards').innerHTML;
    expect(html).toContain('$0');
  });

  test('Standard tier is marked Most Popular', () => {
    window.renderPricing();
    const html = document.getElementById('pricing-cards').innerHTML;
    expect(html).toContain('Most Popular');
  });

  test('God tier displays GOD badge', () => {
    window.renderPricing();
    const html = document.getElementById('pricing-cards').innerHTML;
    expect(html).toContain('GOD');
    expect(html).toContain('10× EVERYTHING');
  });

  test('monthly billing shows full Standard price $19.99', () => {
    // Start in month mode (default); just call renderPricing directly
    window.renderPricing();
    const html = document.getElementById('pricing-cards').innerHTML;
    expect(html).toContain('$19.99');
  });

  test('yearly billing applies 20% discount to Standard tier', () => {
    // Switch to yearly via toggleBilling so the closure variable is updated
    const yearBtn = document.querySelector('[data-period="year"]');
    window.toggleBilling(yearBtn, 'year');
    const html = document.getElementById('pricing-cards').innerHTML;
    // 19.99 * 0.8 = 15.99
    expect(html).toContain('$15.99');
  });

  test('yearly billing does NOT discount the Free tier ($0)', () => {
    const yearBtn = document.querySelector('[data-period="year"]');
    window.toggleBilling(yearBtn, 'year');
    const html = document.getElementById('pricing-cards').innerHTML;
    expect(html).toContain('$0');
  });

  test('God tier yearly billing applies 20% discount', () => {
    const yearBtn = document.querySelector('[data-period="year"]');
    window.toggleBilling(yearBtn, 'year');
    const html = document.getElementById('pricing-cards').innerHTML;
    // 999 * 0.8 = 799.20
    expect(html).toContain('$799.20');
  });

  test('each tier shows token and context rows', () => {
    window.renderPricing();
    const html = document.getElementById('pricing-cards').innerHTML;
    const tokenOccurrences = (html.match(/Tokens/g) || []).length;
    expect(tokenOccurrences).toBe(6);
  });
});

// ─── toggleBilling ────────────────────────────────────────────────────────────

describe('toggleBilling', () => {
  test('switches to yearly pricing (20% off Standard)', () => {
    const yearBtn = document.querySelector('[data-period="year"]');
    window.toggleBilling(yearBtn, 'year');
    // Yearly Standard: 19.99 * 0.8 = 15.99
    const html = document.getElementById('pricing-cards').innerHTML;
    expect(html).toContain('$15.99');
  });

  test('sets billingPeriod back to "month" (re-renders monthly prices)', () => {
    // First switch to year, then back to month
    const yearBtn = document.querySelector('[data-period="year"]');
    window.toggleBilling(yearBtn, 'year');
    const monthBtn = document.querySelector('[data-period="month"]');
    window.toggleBilling(monthBtn, 'month');
    // Monthly Standard price should be back to $19.99 (not $15.99)
    const html = document.getElementById('pricing-cards').innerHTML;
    expect(html).toContain('$19.99');
    expect(html).not.toContain('$15.99');
  });

  test('adds "active" class to clicked button', () => {
    const yearBtn = document.querySelector('[data-period="year"]');
    window.toggleBilling(yearBtn, 'year');
    expect(yearBtn.classList.contains('active')).toBe(true);
  });

  test('removes "active" class from other billing buttons', () => {
    const yearBtn = document.querySelector('[data-period="year"]');
    window.toggleBilling(yearBtn, 'year');
    const monthBtn = document.querySelector('[data-period="month"]');
    expect(monthBtn.classList.contains('active')).toBe(false);
  });

  test('triggers re-render of pricing cards', () => {
    const yearBtn = document.querySelector('[data-period="year"]');
    window.toggleBilling(yearBtn, 'year');
    // After switching to yearly, God tier at $999 * 0.8 = $799.20
    const html = document.getElementById('pricing-cards').innerHTML;
    expect(html).toContain('$799.20');
  });
});

// ─── updateCost ───────────────────────────────────────────────────────────────

describe('updateCost', () => {
  test('computes Poe cost correctly for 1200 calls', () => {
    document.getElementById('call-slider').value = '1200';
    window.updateCost();
    // 1200 * 0.0103 = 12.36
    expect(document.getElementById('poe-cost').textContent).toBe('$12.36');
  });

  test('computes OpenAI cost correctly for 1200 calls', () => {
    document.getElementById('call-slider').value = '1200';
    window.updateCost();
    // 1200 * 0.074 = 88.8 → toFixed(0) = "89"
    expect(document.getElementById('openai-cost').textContent).toBe('$89');
  });

  test('updates call-value display with locale-formatted number', () => {
    document.getElementById('call-slider').value = '5000';
    window.updateCost();
    expect(document.getElementById('call-value').textContent).toBe('5,000');
  });

  test('shows Standard tier stats', () => {
    document.getElementById('tier-select').value = 'Standard';
    window.updateCost();
    const html = document.getElementById('token-stats').innerHTML;
    expect(html).toContain('1,000,000');
    expect(html).toContain('128K');
  });

  test('shows Premium tier stats', () => {
    document.getElementById('tier-select').value = 'Premium';
    window.updateCost();
    const html = document.getElementById('token-stats').innerHTML;
    expect(html).toContain('2,000,000');
    expect(html).toContain('200K');
  });

  test('shows God tier stats with 10M+ tokens', () => {
    document.getElementById('tier-select').value = 'God';
    window.updateCost();
    const html = document.getElementById('token-stats').innerHTML;
    expect(html).toContain('10,000,000+');
    expect(html).toContain('1.28M');
  });

  test('God tier renders extra crown badge', () => {
    document.getElementById('tier-select').value = 'God';
    window.updateCost();
    const html = document.getElementById('token-stats').innerHTML;
    expect(html).toContain('fa-crown');
    expect(html).toContain('God Mode');
  });

  test('Standard tier does NOT render God Mode badge', () => {
    document.getElementById('tier-select').value = 'Standard';
    window.updateCost();
    const html = document.getElementById('token-stats').innerHTML;
    expect(html).not.toContain('God Mode');
  });

  test('boundary: minimum slider value (100 calls)', () => {
    document.getElementById('call-slider').value = '100';
    window.updateCost();
    // 100 * 0.0103 = 1.03
    expect(document.getElementById('poe-cost').textContent).toBe('$1.03');
  });

  test('boundary: maximum slider value (10000 calls)', () => {
    document.getElementById('call-slider').value = '10000';
    window.updateCost();
    // 10000 * 0.0103 = 103.00
    expect(document.getElementById('poe-cost').textContent).toBe('$103.00');
    // 10000 * 0.074 = 740
    expect(document.getElementById('openai-cost').textContent).toBe('$740');
  });
});

// ─── toggleMockMode ───────────────────────────────────────────────────────────

describe('toggleMockMode', () => {
  test('toggles ON: status text changes to "Mock: ON"', () => {
    // Initial state: OFF — icon should be toggle-off
    expect(document.getElementById('mock-icon').className).toContain('fa-toggle-off');
    window.toggleMockMode();
    expect(document.getElementById('mock-status').textContent).toBe('Mock: ON');
    expect(document.getElementById('mock-icon').className).toContain('fa-toggle-on');
  });

  test('toggles OFF on second call: status text returns to "Mock: OFF"', () => {
    window.toggleMockMode();
    window.toggleMockMode();
    expect(document.getElementById('mock-status').textContent).toBe('Mock: OFF');
    expect(document.getElementById('mock-icon').className).toContain('fa-toggle-off');
  });

  test('updates mock-status text to "Mock: ON"', () => {
    window.toggleMockMode();
    expect(document.getElementById('mock-status').textContent).toBe('Mock: ON');
  });

  test('updates mock-status text to "Mock: OFF" when toggled off', () => {
    window.toggleMockMode();
    window.toggleMockMode();
    expect(document.getElementById('mock-status').textContent).toBe('Mock: OFF');
  });

  test('changes icon className to fa-toggle-on when ON', () => {
    window.toggleMockMode();
    expect(document.getElementById('mock-icon').className).toBe('fas fa-toggle-on');
  });

  test('changes icon className to fa-toggle-off when OFF', () => {
    window.toggleMockMode();
    window.toggleMockMode();
    expect(document.getElementById('mock-icon').className).toBe('fas fa-toggle-off');
  });

  test('adds bg-emerald-400 class to mock-btn when ON', () => {
    window.toggleMockMode();
    expect(document.getElementById('mock-btn').classList.contains('bg-emerald-400')).toBe(true);
  });

  test('removes bg-emerald-400 class from mock-btn when OFF', () => {
    window.toggleMockMode();
    window.toggleMockMode();
    expect(document.getElementById('mock-btn').classList.contains('bg-emerald-400')).toBe(false);
  });

  test('removes bg-white class from mock-btn when ON', () => {
    window.toggleMockMode();
    expect(document.getElementById('mock-btn').classList.contains('bg-white')).toBe(false);
  });

  test('restores bg-white class on mock-btn when OFF', () => {
    window.toggleMockMode();
    window.toggleMockMode();
    expect(document.getElementById('mock-btn').classList.contains('bg-white')).toBe(true);
  });
});

// ─── sendMockMessage ──────────────────────────────────────────────────────────

describe('sendMockMessage', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('does nothing when input is empty', () => {
    document.getElementById('chat-input').value = '';
    window.sendMockMessage();
    const html = document.getElementById('chat-messages').innerHTML;
    expect(html).toBe('');
  });

  test('does nothing when input contains only whitespace', () => {
    document.getElementById('chat-input').value = '   ';
    window.sendMockMessage();
    const html = document.getElementById('chat-messages').innerHTML;
    expect(html).toBe('');
  });

  test('appends user message bubble to chat-messages', () => {
    document.getElementById('chat-input').value = 'Hello';
    window.sendMockMessage();
    const html = document.getElementById('chat-messages').innerHTML;
    expect(html).toContain('Hello');
  });

  test('clears the input field after sending', () => {
    document.getElementById('chat-input').value = 'Hello';
    window.sendMockMessage();
    expect(document.getElementById('chat-input').value).toBe('');
  });

  test('appends typing indicator immediately after sending', () => {
    document.getElementById('chat-input').value = 'Ping';
    window.sendMockMessage();
    const html = document.getElementById('chat-messages').innerHTML;
    expect(html).toContain('animate-pulse');
  });

  test('replaces typing indicator with AI response after 900ms', () => {
    // Known responses defined in the script
    const knownResponses = [
      'context window 1.28M tokens',
      'RAG retrieval',
      'God Mode activated',
      'Token usage: 1,247 tokens',
      'วิเคราะห์เสร็จแล้วครับ',
    ];
    document.getElementById('chat-input').value = 'Test';
    window.sendMockMessage();
    jest.advanceTimersByTime(900);
    const html = document.getElementById('chat-messages').innerHTML;
    expect(html).not.toContain('animate-pulse');
    // At least one known response substring should be present
    const hasResponse = knownResponses.some(r => html.includes(r));
    expect(hasResponse).toBe(true);
  });

  test('XSS-escapes < and > in user input', () => {
    document.getElementById('chat-input').value = '<script>alert(1)</script>';
    window.sendMockMessage();
    const html = document.getElementById('chat-messages').innerHTML;
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  test('multiple messages can be sent sequentially', () => {
    document.getElementById('chat-input').value = 'First';
    window.sendMockMessage();
    document.getElementById('chat-input').value = 'Second';
    window.sendMockMessage();
    const html = document.getElementById('chat-messages').innerHTML;
    expect(html).toContain('First');
    expect(html).toContain('Second');
  });
});

// ─── simulateRegen ────────────────────────────────────────────────────────────

describe('simulateRegen', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('increases regen-balance by at least 4000', () => {
    const before = parseInt(
      document.getElementById('regen-balance').textContent.replace(/,/g, '')
    );
    window.simulateRegen();
    const after = parseInt(
      document.getElementById('regen-balance').textContent.replace(/,/g, '')
    );
    expect(after - before).toBeGreaterThanOrEqual(4000);
  });

  test('increases regen-balance by at most 12000', () => {
    const before = parseInt(
      document.getElementById('regen-balance').textContent.replace(/,/g, '')
    );
    window.simulateRegen();
    const after = parseInt(
      document.getElementById('regen-balance').textContent.replace(/,/g, '')
    );
    expect(after - before).toBeLessThanOrEqual(12000);
  });

  test('updates regen-balance text to new (higher) balance', () => {
    const before = parseInt(
      document.getElementById('regen-balance').textContent.replace(/,/g, '')
    );
    window.simulateRegen();
    const after = parseInt(
      document.getElementById('regen-balance').textContent.replace(/,/g, '')
    );
    expect(after).toBeGreaterThan(before);
  });

  test('regen-balance is formatted with commas', () => {
    window.simulateRegen();
    const text = document.getElementById('regen-balance').textContent;
    expect(text).toMatch(/\d{1,3}(,\d{3})+/);
  });

  test('temporarily adds scale-110 class then removes it after 300ms', () => {
    window.simulateRegen();
    expect(document.getElementById('regen-balance').classList.contains('scale-110')).toBe(true);
    jest.advanceTimersByTime(300);
    expect(document.getElementById('regen-balance').classList.contains('scale-110')).toBe(false);
  });

  test('updates regen-progress width above 78%', () => {
    window.simulateRegen();
    const width = parseFloat(document.getElementById('regen-progress').style.width);
    expect(width).toBeGreaterThanOrEqual(78);
  });

  test('regen-progress width never exceeds 100%', () => {
    // Run many times to stress-test Math.random boundary
    for (let i = 0; i < 20; i++) {
      window.simulateRegen();
      const width = parseFloat(document.getElementById('regen-progress').style.width);
      expect(width).toBeLessThanOrEqual(100);
    }
  });

  test('resets regen-progress width to 78% after 1500ms', () => {
    window.simulateRegen();
    jest.advanceTimersByTime(1500);
    expect(document.getElementById('regen-progress').style.width).toBe('78%');
  });

  test('shows a toast notification', () => {
    window.simulateRegen();
    const toast = document.querySelector('.bg-emerald-600');
    expect(toast).not.toBeNull();
    expect(toast.innerHTML).toContain('tokens regenerated');
  });

  test('cumulative calls keep increasing regen-balance', () => {
    const initial = parseInt(
      document.getElementById('regen-balance').textContent.replace(/,/g, '')
    );
    window.simulateRegen();
    window.simulateRegen();
    const final = parseInt(
      document.getElementById('regen-balance').textContent.replace(/,/g, '')
    );
    expect(final).toBeGreaterThan(initial + 8000);
  });
});

// ─── showToast ────────────────────────────────────────────────────────────────

describe('showToast', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('appends a toast element to the body', () => {
    window.showToast('Hello Toast');
    const toast = document.querySelector('.bg-emerald-600');
    expect(toast).not.toBeNull();
  });

  test('renders the provided HTML content inside the toast', () => {
    window.showToast('<b>Test message</b>');
    const toast = document.querySelector('.bg-emerald-600');
    expect(toast.innerHTML).toContain('<b>Test message</b>');
  });

  test('toast has z-index class z-[200]', () => {
    window.showToast('z-test');
    const toast = document.querySelector('.bg-emerald-600');
    expect(toast.className).toContain('z-[200]');
  });

  test('sets opacity to 0 after 2800ms', () => {
    window.showToast('Fade test');
    jest.advanceTimersByTime(2800);
    const toast = document.querySelector('.bg-emerald-600');
    expect(toast.style.opacity).toBe('0');
  });

  test('removes the toast element from DOM after 3200ms (2800 + 400)', () => {
    window.showToast('Remove test');
    jest.advanceTimersByTime(3200);
    const toast = document.querySelector('.bg-emerald-600');
    expect(toast).toBeNull();
  });

  test('multiple calls create multiple toasts', () => {
    window.showToast('First');
    window.showToast('Second');
    const toasts = document.querySelectorAll('.bg-emerald-600');
    expect(toasts.length).toBe(2);
  });
});