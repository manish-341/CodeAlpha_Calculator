/**
 * ====================================================================
 * OMNICALC PRO — JAVASCRIPT ENGINE
 * Advanced Standard & Scientific Calculator
 * Features:
 *   - Precision arithmetic (+, −, ×, ÷, %) with BODMAS precedence
 *   - Real-time live result evaluation as you type
 *   - Scientific mode: sin, cos, tan, sqrt, power, log, ln, factorial, pi, e
 *   - Calculation history tape with LocalStorage persistence & recall
 *   - HTML5 Web Audio API tactile audio click synthesis (no external assets)
 *   - Full physical keyboard support with visual key depression
 *   - 5 multi-theme switcher with persistent settings
 *   - Copy-to-clipboard with toast feedback
 * ====================================================================
 */

// --- Calculator State ---
const state = {
  expression: "",       // Expression being formed (e.g. "125 * 4 + 50")
  displayValue: "0",    // Current active operand or result
  lastCalculated: false,// Whether the current value was the result of "="
  isScientific: false,  // Whether scientific mode is active
  soundEnabled: true,   // Audio feedback toggle
  currentTheme: localStorage.getItem("omnicalc_theme") || "midnight",
  history: JSON.parse(localStorage.getItem("omnicalc_history") || "[]")
};

// --- DOM Selectors ---
const dom = {
  calcCard: document.querySelector(".calc-card"),
  expressionDisplay: document.getElementById("expression-display"),
  resultDisplay: document.getElementById("result-display"),
  scientificPanel: document.getElementById("scientific-panel"),
  modeToggleBtn: document.getElementById("mode-toggle-btn"),
  soundToggleBtn: document.getElementById("sound-toggle-btn"),
  historyToggleBtn: document.getElementById("history-toggle-btn"),
  historyDrawer: document.getElementById("history-drawer"),
  historyList: document.getElementById("history-list"),
  clearHistoryBtn: document.getElementById("clear-history-btn"),
  closeHistoryBtn: document.getElementById("close-history-btn"),
  copyBtn: document.getElementById("copy-btn"),
  themeBtn: document.getElementById("theme-btn"),
  themeDropdown: document.getElementById("theme-dropdown"),
  themeMenuWrap: document.getElementById("theme-menu-wrap"),
  shortcutsBtn: document.getElementById("shortcuts-btn"),
  shortcutsModal: document.getElementById("shortcuts-modal"),
  closeModalBtn: document.getElementById("close-modal-btn"),
  toast: document.getElementById("toast")
};

// ====================================================================
// WEB AUDIO API CLICK SOUND SYNTHESIZER
// ====================================================================
let audioCtx = null;

function playKeyClickSound(frequency = 600, duration = 0.02) {
  if (!state.soundEnabled) return;

  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.5, audioCtx.currentTime + duration);

    gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (err) {
    // Audio context silent fallback
  }
}

// ====================================================================
// CORE CALCULATOR LOGIC
// ====================================================================

/**
 * Handle digit or decimal entry
 */
function inputDigit(digit) {
  playKeyClickSound(750);

  // If user just pressed "=" and types a new digit, reset expression
  if (state.lastCalculated) {
    state.expression = "";
    state.displayValue = digit === "." ? "0." : digit;
    state.lastCalculated = false;
  } else {
    if (digit === ".") {
      // Prevent multiple decimals in the same number segment
      const lastToken = getLastToken(state.expression + state.displayValue);
      if (lastToken.includes(".")) return;
      state.displayValue = state.displayValue === "0" ? "0." : state.displayValue + ".";
    } else if (digit === "00") {
      if (state.displayValue === "0") return;
      state.displayValue += "00";
    } else {
      if (state.displayValue === "0") {
        state.displayValue = digit;
      } else {
        state.displayValue += digit;
      }
    }
  }

  updateScreen();
  evaluateLivePreview();
}

/**
 * Handle standard arithmetic operators (+, -, *, /)
 */
function inputOperator(op) {
  playKeyClickSound(550);
  state.lastCalculated = false;

  const currentVal = state.displayValue;
  const expr = state.expression.trim();

  // If there is a current number, append it to expression
  if (currentVal !== "") {
    state.expression = expr ? `${expr} ${currentVal} ${op}` : `${currentVal} ${op}`;
    state.displayValue = "";
  } else if (expr) {
    // If last token was an operator, replace it
    const tokens = expr.split(" ");
    const last = tokens[tokens.length - 1];
    if (["+", "-", "*", "/"].includes(last)) {
      tokens[tokens.length - 1] = op;
      state.expression = tokens.join(" ");
    }
  }

  updateScreen();
}

/**
 * Calculate the final result (=)
 */
function calculateResult() {
  playKeyClickSound(900, 0.04);
  const fullExpr = `${state.expression} ${state.displayValue}`.trim();
  if (!fullExpr) return;

  try {
    const sanitized = sanitizeMathExpression(fullExpr);
    const result = evaluateExpression(sanitized);

    if (isNaN(result) || !isFinite(result)) {
      state.displayValue = "Cannot divide by 0";
      state.lastCalculated = true;
      updateScreen();
      return;
    }

    // Format clean number
    const formatted = formatNumber(result);
    
    // Save to calculation history
    addHistoryItem(formatDisplayExpression(fullExpr), formatted);

    state.expression = "";
    state.displayValue = formatted;
    state.lastCalculated = true;
    updateScreen();
  } catch (err) {
    state.displayValue = "Error";
    state.lastCalculated = true;
    updateScreen();
  }
}

/**
 * Live real-time preview before clicking "="
 */
function evaluateLivePreview() {
  const fullExpr = `${state.expression} ${state.displayValue}`.trim();
  if (!fullExpr || !state.expression) return;

  try {
    const sanitized = sanitizeMathExpression(fullExpr);
    const result = evaluateExpression(sanitized);
    if (!isNaN(result) && isFinite(result)) {
      dom.expressionDisplay.textContent = `${formatDisplayExpression(fullExpr)} = ${formatNumber(result)}`;
    }
  } catch (e) {
    // Live preview fails gracefully until syntax is complete
  }
}

/**
 * Safe expression evaluation replacing math symbols
 */
function sanitizeMathExpression(expr) {
  return expr
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/\^/g, "**")
    .replace(/π/g, `${Math.PI}`)
    .replace(/e(?![a-z])/g, `${Math.E}`);
}

function evaluateExpression(str) {
  // Safe math parser using Function constructor without global scope pollution
  return Function(`'use strict'; return (${str})`)();
}

/**
 * Handle special scientific actions (sin, cos, tan, sqrt, etc.)
 */
function handleScientificAction(action) {
  playKeyClickSound(650);
  let val = parseFloat(state.displayValue) || 0;
  let result = null;

  switch (action) {
    case "sin":
      result = Math.sin((val * Math.PI) / 180); // In degrees
      addHistoryItem(`sin(${val}°)`, formatNumber(result));
      break;
    case "cos":
      result = Math.cos((val * Math.PI) / 180);
      addHistoryItem(`cos(${val}°)`, formatNumber(result));
      break;
    case "tan":
      result = Math.tan((val * Math.PI) / 180);
      addHistoryItem(`tan(${val}°)`, formatNumber(result));
      break;
    case "sqrt":
      if (val < 0) {
        showToast("Invalid Input for √", "ri-error-warning-line");
        return;
      }
      result = Math.sqrt(val);
      addHistoryItem(`√(${val})`, formatNumber(result));
      break;
    case "log":
      if (val <= 0) return;
      result = Math.log10(val);
      addHistoryItem(`log(${val})`, formatNumber(result));
      break;
    case "ln":
      if (val <= 0) return;
      result = Math.log(val);
      addHistoryItem(`ln(${val})`, formatNumber(result));
      break;
    case "power":
      state.expression = `${val} ^`;
      state.displayValue = "";
      updateScreen();
      return;
    case "fact":
      result = factorial(Math.min(Math.floor(val), 170));
      addHistoryItem(`${val}!`, formatNumber(result));
      break;
    case "pi":
      state.displayValue = `${Math.PI}`;
      updateScreen();
      return;
    case "e":
      state.displayValue = `${Math.E}`;
      updateScreen();
      return;
    case "bracket-open":
      state.expression = `${state.expression} (`.trim();
      updateScreen();
      return;
    case "bracket-close":
      state.expression = `${state.expression} ${state.displayValue} )`.trim();
      state.displayValue = "";
      updateScreen();
      return;
    case "percent":
      result = val / 100;
      break;
    case "negate":
      result = val * -1;
      break;
  }

  if (result !== null) {
    state.displayValue = formatNumber(result);
    state.lastCalculated = true;
    updateScreen();
  }
}

function factorial(n) {
  if (n < 0) return NaN;
  if (n === 0 || n === 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

/**
 * Clear All (AC)
 */
function clearAll() {
  playKeyClickSound(400, 0.03);
  state.expression = "";
  state.displayValue = "0";
  state.lastCalculated = false;
  updateScreen();
}

/**
 * Delete last entered character (Backspace)
 */
function deleteLast() {
  playKeyClickSound(450);
  if (state.lastCalculated) {
    clearAll();
    return;
  }

  if (state.displayValue.length > 1) {
    state.displayValue = state.displayValue.slice(0, -1);
  } else {
    state.displayValue = "0";
  }
  updateScreen();
  evaluateLivePreview();
}

/**
 * Screen Display Update & Auto-Shrink Font
 */
function updateScreen() {
  const exprDisplay = formatDisplayExpression(state.expression);
  dom.expressionDisplay.textContent = exprDisplay;
  
  const text = state.displayValue || "0";
  dom.resultDisplay.textContent = text;

  // Auto shrink font size for long numbers
  dom.resultDisplay.className = "result-line";
  const len = text.length;
  if (len > 14) {
    dom.resultDisplay.classList.add("shrink-3");
  } else if (len > 10) {
    dom.resultDisplay.classList.add("shrink-2");
  } else if (len > 7) {
    dom.resultDisplay.classList.add("shrink-1");
  }
}

function formatDisplayExpression(expr) {
  return expr
    .replace(/\*/g, " × ")
    .replace(/\//g, " ÷ ")
    .replace(/-/g, " − ")
    .replace(/\+/g, " + ");
}

function formatNumber(num) {
  if (isNaN(num) || !isFinite(num)) return "Error";
  // Fix 0.1 + 0.2 floating point inaccuracies
  const rounded = parseFloat(num.toFixed(10));
  return `${rounded}`;
}

function getLastToken(str) {
  const parts = str.trim().split(/[\s+\-*/]+/);
  return parts[parts.length - 1] || "";
}

// ====================================================================
// HISTORY TAPE SYSTEM
// ====================================================================

function addHistoryItem(expr, ans) {
  const item = {
    id: Date.now(),
    expr: expr,
    ans: ans,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  state.history.unshift(item);
  if (state.history.length > 30) state.history.pop();
  localStorage.setItem("omnicalc_history", JSON.stringify(state.history));
  renderHistory();
}

function renderHistory() {
  if (state.history.length === 0) {
    dom.historyList.innerHTML = `
      <div class="history-empty">
        <i class="ri-draft-line"></i>
        <p>No calculation history yet.<br>Start calculating!</p>
      </div>
    `;
    return;
  }

  dom.historyList.innerHTML = state.history.map(item => `
    <div class="history-item" data-ans="${item.ans}" title="Click to recall answer">
      <div class="history-expr">${item.expr}</div>
      <div class="history-ans">= ${item.ans}</div>
    </div>
  `).join("");

  dom.historyList.querySelectorAll(".history-item").forEach(el => {
    el.addEventListener("click", () => {
      state.displayValue = el.dataset.ans;
      state.lastCalculated = true;
      updateScreen();
      showToast(`Recalled ${el.dataset.ans}`, "ri-history-line");
    });
  });
}

function clearHistory() {
  state.history = [];
  localStorage.removeItem("omnicalc_history");
  renderHistory();
  showToast("History cleared", "ri-delete-bin-line");
}

// ====================================================================
// THEME & UTILITIES
// ====================================================================

function initThemeSystem() {
  document.documentElement.setAttribute("data-theme", state.currentTheme);

  dom.themeDropdown.querySelectorAll(".theme-item").forEach(item => {
    item.classList.toggle("active", item.dataset.theme === state.currentTheme);
    item.addEventListener("click", () => {
      const theme = item.dataset.theme;
      state.currentTheme = theme;
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("omnicalc_theme", theme);

      dom.themeDropdown.querySelectorAll(".theme-item").forEach(t => t.classList.remove("active"));
      item.classList.add("active");
      dom.themeDropdown.classList.add("hidden");

      showToast(`Theme: ${item.textContent.trim()}`, "ri-palette-line");
    });
  });

  dom.themeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dom.themeDropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!dom.themeMenuWrap.contains(e.target)) {
      dom.themeDropdown.classList.add("hidden");
    }
  });
}

// Toast Feedback
let toastTimer;
function showToast(message, icon = "ri-check-line") {
  clearTimeout(toastTimer);
  const msgEl = dom.toast.querySelector(".toast-msg");
  const iconEl = dom.toast.querySelector(".toast-icon");
  if (msgEl) msgEl.textContent = message;
  if (iconEl) iconEl.className = `toast-icon ${icon}`;

  dom.toast.classList.add("show");
  toastTimer = setTimeout(() => {
    dom.toast.classList.remove("show");
  }, 2200);
}

// Copy to Clipboard
function copyResultToClipboard() {
  const result = dom.resultDisplay.textContent;
  if (!result || result === "Error") return;

  navigator.clipboard.writeText(result).then(() => {
    showToast(`Copied ${result} to clipboard!`, "ri-clipboard-line");
  }).catch(() => {
    showToast("Failed to copy", "ri-error-warning-line");
  });
}

// ====================================================================
// PHYSICAL KEYBOARD INTEGRATION & EVENT LISTENERS
// ====================================================================

function initKeypadListeners() {
  // Keypad clicks
  document.querySelectorAll(".key").forEach(btn => {
    btn.addEventListener("click", () => {
      const val = btn.dataset.val;
      const action = btn.dataset.action;

      if (val !== undefined && action === undefined) {
        inputDigit(val);
      } else if (action === "operator") {
        inputOperator(val);
      } else if (action === "calculate") {
        calculateResult();
      } else if (action === "clear") {
        clearAll();
      } else if (action === "delete") {
        deleteLast();
      } else if (action) {
        handleScientificAction(action);
      }
    });
  });

  // Scientific Mode Toggle
  dom.modeToggleBtn.addEventListener("click", () => {
    state.isScientific = !state.isScientific;
    dom.modeToggleBtn.classList.toggle("active", state.isScientific);
    dom.scientificPanel.classList.toggle("hidden", !state.isScientific);
    dom.calcCard.classList.toggle("scientific-active", state.isScientific);
    showToast(state.isScientific ? "Scientific Mode Enabled" : "Standard Mode", "ri-function-line");
  });

  // Sound Toggle
  dom.soundToggleBtn.addEventListener("click", () => {
    state.soundEnabled = !state.soundEnabled;
    dom.soundToggleBtn.classList.toggle("active", state.soundEnabled);
    dom.soundToggleBtn.innerHTML = state.soundEnabled 
      ? `<i class="ri-volume-up-line"></i>` 
      : `<i class="ri-volume-mute-line"></i>`;
    showToast(state.soundEnabled ? "Audio Click Enabled" : "Muted", "ri-volume-up-line");
  });

  // History Drawer Toggle
  dom.historyToggleBtn.addEventListener("click", () => {
    const isHidden = dom.historyDrawer.classList.contains("hidden");
    dom.historyDrawer.classList.toggle("hidden", !isHidden);
    dom.historyToggleBtn.classList.toggle("active", isHidden);
  });

  dom.closeHistoryBtn.addEventListener("click", () => {
    dom.historyDrawer.classList.add("hidden");
    dom.historyToggleBtn.classList.remove("active");
  });

  dom.clearHistoryBtn.addEventListener("click", clearHistory);
  dom.copyBtn.addEventListener("click", copyResultToClipboard);

  // Shortcuts Dialog
  dom.shortcutsBtn.addEventListener("click", () => dom.shortcutsModal.showModal());
  dom.closeModalBtn.addEventListener("click", () => dom.shortcutsModal.close());
  dom.shortcutsModal.addEventListener("click", (e) => {
    if (e.target === dom.shortcutsModal) dom.shortcutsModal.close();
  });

  // Physical Keyboard Listener
  window.addEventListener("keydown", (e) => {
    // Ignore if modal open
    if (dom.shortcutsModal.open) return;

    // Visual button press helper
    highlightPhysicalKey(e.key);

    if (e.key >= "0" && e.key <= "9") {
      inputDigit(e.key);
    } else if (e.key === ".") {
      inputDigit(".");
    } else if (["+", "-", "*", "/"].includes(e.key)) {
      e.preventDefault();
      inputOperator(e.key);
    } else if (e.key === "Enter" || e.key === "=") {
      e.preventDefault();
      calculateResult();
    } else if (e.key === "Backspace") {
      e.preventDefault();
      deleteLast();
    } else if (e.key === "Escape" || e.key.toLowerCase() === "c") {
      e.preventDefault();
      clearAll();
    } else if (e.key === "(") {
      handleScientificAction("bracket-open");
    } else if (e.key === ")") {
      handleScientificAction("bracket-close");
    } else if (e.key === "%") {
      handleScientificAction("percent");
    }
  });
}

function highlightPhysicalKey(key) {
  let selector = `.key[data-key="${key}"]`;
  if (key === "Enter") selector = `.key[data-action="calculate"]`;
  if (key === "Escape") selector = `.key[data-action="clear"]`;

  const btn = document.querySelector(selector);
  if (btn) {
    btn.classList.add("pressed");
    setTimeout(() => btn.classList.remove("pressed"), 120);
  }
}

// --- App Initialization ---
function init() {
  initThemeSystem();
  renderHistory();
  updateScreen();
  initKeypadListeners();
}

document.addEventListener("DOMContentLoaded", init);
