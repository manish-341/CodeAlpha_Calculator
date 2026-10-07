/**
 * ====================================================================
 * OMNICALC PRO — JAVASCRIPT MATH STUDIO ENGINE
 * Fast, Responsive Standard & Scientific Calculator
 * ====================================================================
 */

// --- Calculator State ---
const state = {
  currentInput: "0",        // Current number shown in large display
  previousOperand: null,     // First operand before operator
  pendingOperator: null,     // Active operator ('+', '-', '*', '/')
  expressionPreview: "",     // Top formula line
  shouldResetInput: false,   // True after clicking an operator or "="
  isScientific: false,       // Scientific mode active
  soundEnabled: true,        // Audio click
  currentTheme: localStorage.getItem("omnicalc_theme") || "midnight",
  history: JSON.parse(localStorage.getItem("omnicalc_history") || "[]")
};

// --- DOM Selectors ---
const dom = {
  expressionDisplay: document.getElementById("expression-display"),
  resultDisplay: document.getElementById("result-display"),
  activeOpBadge: document.getElementById("active-op-badge"),
  scientificPanel: document.getElementById("scientific-panel"),
  tabStandard: document.getElementById("tab-standard"),
  tabScientific: document.getElementById("tab-scientific"),
  soundToggleBtn: document.getElementById("sound-toggle-btn"),
  historyList: document.getElementById("history-list"),
  clearHistoryBtn: document.getElementById("clear-history-btn"),
  copyBtn: document.getElementById("copy-btn"),
  themeBtn: document.getElementById("theme-btn"),
  themeDropdown: document.getElementById("theme-dropdown"),
  themeMenuWrap: document.getElementById("theme-menu-wrap"),
  themeLabel: document.getElementById("theme-label"),
  shortcutsBtn: document.getElementById("shortcuts-btn"),
  shortcutsModal: document.getElementById("shortcuts-modal"),
  closeModalBtn: document.getElementById("close-modal-btn"),
  toast: document.getElementById("toast")
};

// ====================================================================
// WEB AUDIO SOUND SYNTHESIS (LIGHTWEIGHT & NON-BLOCKING)
// ====================================================================
let audioCtx = null;

function playSound(freq = 650) {
  if (!state.soundEnabled) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.02);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.02);
  } catch (e) {}
}

// ====================================================================
// CORE CALCULATOR ACTIONS
// ====================================================================

/**
 * Handle Digits & Decimal Point
 */
function inputDigit(digit) {
  playSound(720);
  clearActiveOperatorHighlight();

  if (state.shouldResetInput) {
    state.currentInput = digit === "." ? "0." : digit;
    state.shouldResetInput = false;
  } else {
    if (digit === ".") {
      if (state.currentInput.includes(".")) return;
      state.currentInput += ".";
    } else {
      state.currentInput = state.currentInput === "0" ? digit : state.currentInput + digit;
    }
  }

  updateScreen();
}

/**
 * Handle Operators (+, −, ×, ÷)
 */
function handleOperator(nextOperator) {
  playSound(580);
  const inputValue = parseFloat(state.currentInput);

  if (state.pendingOperator && state.shouldResetInput) {
    state.pendingOperator = nextOperator;
    state.expressionPreview = `${formatNumber(state.previousOperand)} ${formatOperatorSymbol(nextOperator)}`;
    highlightActiveOperator(nextOperator);
    updateScreen();
    return;
  }

  if (state.previousOperand === null) {
    state.previousOperand = inputValue;
  } else if (state.pendingOperator) {
    const result = compute(state.previousOperand, inputValue, state.pendingOperator);
    if (!isFinite(result)) {
      handleError("Cannot divide by 0");
      return;
    }
    state.currentInput = `${formatNumber(result)}`;
    state.previousOperand = result;
  }

  state.shouldResetInput = true;
  state.pendingOperator = nextOperator;
  state.expressionPreview = `${formatNumber(state.previousOperand)} ${formatOperatorSymbol(nextOperator)}`;

  highlightActiveOperator(nextOperator);
  updateScreen();
}

/**
 * Compute the final result (=)
 */
function handleEquals() {
  playSound(900);
  if (!state.pendingOperator || state.previousOperand === null) return;

  const currentVal = parseFloat(state.currentInput);
  const result = compute(state.previousOperand, currentVal, state.pendingOperator);

  if (!isFinite(result)) {
    handleError("Cannot divide by 0");
    return;
  }

  const prevFormatted = formatNumber(state.previousOperand);
  const currFormatted = formatNumber(currentVal);
  const opSymbol = formatOperatorSymbol(state.pendingOperator);
  const resultFormatted = formatNumber(result);

  // Top line shows full completed formula: "96 + 9 ="
  state.expressionPreview = `${prevFormatted} ${opSymbol} ${currFormatted} =`;
  // Main big line shows answer: "105"
  state.currentInput = `${resultFormatted}`;

  // Save to history tape
  addHistoryItem(`${prevFormatted} ${opSymbol} ${currFormatted}`, resultFormatted);

  state.previousOperand = null;
  state.pendingOperator = null;
  state.shouldResetInput = true;

  clearActiveOperatorHighlight();
  updateScreen();
}

function compute(a, b, op) {
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/": return b === 0 ? Infinity : a / b;
    case "^": return Math.pow(a, b);
    default: return b;
  }
}

/**
 * Scientific Functions
 */
function handleScientificAction(action) {
  playSound(640);
  clearActiveOperatorHighlight();
  let val = parseFloat(state.currentInput) || 0;
  let res = null;
  let formulaLabel = "";

  switch (action) {
    case "sin":
      res = Math.sin((val * Math.PI) / 180);
      formulaLabel = `sin(${val}°)`;
      break;
    case "cos":
      res = Math.cos((val * Math.PI) / 180);
      formulaLabel = `cos(${val}°)`;
      break;
    case "tan":
      res = Math.tan((val * Math.PI) / 180);
      formulaLabel = `tan(${val}°)`;
      break;
    case "sqrt":
      if (val < 0) {
        handleError("Invalid Input");
        return;
      }
      res = Math.sqrt(val);
      formulaLabel = `√(${val})`;
      break;
    case "power":
      handleOperator("^");
      return;
    case "log":
      if (val <= 0) {
        handleError("Invalid Input");
        return;
      }
      res = Math.log10(val);
      formulaLabel = `log(${val})`;
      break;
    case "ln":
      if (val <= 0) {
        handleError("Invalid Input");
        return;
      }
      res = Math.log(val);
      formulaLabel = `ln(${val})`;
      break;
    case "pi":
      state.currentInput = `${Math.PI}`;
      state.shouldResetInput = true;
      updateScreen();
      return;
    case "e":
      state.currentInput = `${Math.E}`;
      state.shouldResetInput = true;
      updateScreen();
      return;
    case "fact":
      res = factorial(Math.min(Math.floor(val), 170));
      formulaLabel = `${val}!`;
      break;
    case "percent":
      res = val / 100;
      formulaLabel = `${val}%`;
      break;
    case "negate":
      res = val * -1;
      break;
  }

  if (res !== null) {
    const formatted = formatNumber(res);
    if (formulaLabel) {
      state.expressionPreview = `${formulaLabel} =`;
      addHistoryItem(formulaLabel, formatted);
    }
    state.currentInput = `${formatted}`;
    state.shouldResetInput = true;
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
 * Clear Screen (AC)
 */
function clearAll() {
  playSound(450);
  state.currentInput = "0";
  state.previousOperand = null;
  state.pendingOperator = null;
  state.expressionPreview = "";
  state.shouldResetInput = false;
  clearActiveOperatorHighlight();
  updateScreen();
}

/**
 * Delete last digit (DEL / Backspace)
 */
function deleteLast() {
  playSound(480);
  if (state.shouldResetInput) {
    clearAll();
    return;
  }

  if (state.currentInput.length > 1) {
    state.currentInput = state.currentInput.slice(0, -1);
  } else {
    state.currentInput = "0";
  }
  updateScreen();
}

function handleError(msg) {
  state.currentInput = msg;
  state.previousOperand = null;
  state.pendingOperator = null;
  state.shouldResetInput = true;
  clearActiveOperatorHighlight();
  updateScreen();
}

// ====================================================================
// SCREEN DISPLAY HELPERS
// ====================================================================

function updateScreen() {
  dom.expressionDisplay.textContent = state.expressionPreview;
  dom.resultDisplay.textContent = formatWithCommas(state.currentInput);

  if (state.pendingOperator) {
    dom.activeOpBadge.classList.remove("hidden");
    dom.activeOpBadge.textContent = formatOperatorSymbol(state.pendingOperator);
  } else {
    dom.activeOpBadge.classList.add("hidden");
  }

  // Auto shrink font size for long numbers
  const len = state.currentInput.length;
  dom.resultDisplay.className = "result-line";
  if (len > 14) {
    dom.resultDisplay.classList.add("shrink-3");
  } else if (len > 10) {
    dom.resultDisplay.classList.add("shrink-2");
  } else if (len > 7) {
    dom.resultDisplay.classList.add("shrink-1");
  }
}

function formatWithCommas(valStr) {
  if (valStr === "Error" || isNaN(valStr) || valStr.includes("Cannot")) return valStr;
  const parts = valStr.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

function formatOperatorSymbol(op) {
  switch (op) {
    case "*": return "×";
    case "/": return "÷";
    case "-": return "−";
    case "+": return "+";
    case "^": return "^";
    default: return op;
  }
}

function formatNumber(num) {
  if (isNaN(num) || !isFinite(num)) return "Error";
  const rounded = Math.round(num * 1e10) / 1e10;
  return `${rounded}`;
}

function highlightActiveOperator(op) {
  clearActiveOperatorHighlight();
  const btn = document.querySelector(`.op-key[data-val="${op}"]`);
  if (btn) btn.classList.add("active-operator");
}

function clearActiveOperatorHighlight() {
  document.querySelectorAll(".op-key").forEach(btn => btn.classList.remove("active-operator"));
}

// ====================================================================
// HISTORY TAPE SYSTEM
// ====================================================================

function addHistoryItem(expr, ans) {
  const item = {
    id: Date.now(),
    expr: expr,
    ans: ans
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
        <i class="ri-calculator-line"></i>
        <p>Calculations you make will appear here for instant 1-click replay.</p>
      </div>
    `;
    return;
  }

  dom.historyList.innerHTML = state.history.map(item => `
    <div class="history-item" data-ans="${item.ans}" title="Click to recall answer">
      <div class="history-expr">${item.expr}</div>
      <div class="history-ans">= ${formatWithCommas(item.ans)}</div>
    </div>
  `).join("");

  dom.historyList.querySelectorAll(".history-item").forEach(el => {
    el.addEventListener("click", () => {
      state.currentInput = el.dataset.ans;
      state.shouldResetInput = true;
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
// THEMES & QUICK TOOLS
// ====================================================================

const THEME_NAMES = {
  midnight: "Midnight",
  cyberpunk: "Cyberpunk",
  aurora: "Aurora",
  sunset: "Sunset",
  light: "Luxe Light"
};

function initThemeSystem() {
  document.documentElement.setAttribute("data-theme", state.currentTheme);
  dom.themeLabel.textContent = THEME_NAMES[state.currentTheme] || "Midnight";

  dom.themeDropdown.querySelectorAll(".theme-item").forEach(item => {
    item.classList.toggle("active", item.dataset.theme === state.currentTheme);
    item.addEventListener("click", () => {
      const theme = item.dataset.theme;
      state.currentTheme = theme;
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("omnicalc_theme", theme);

      dom.themeLabel.textContent = THEME_NAMES[theme];
      dom.themeDropdown.querySelectorAll(".theme-item").forEach(t => t.classList.remove("active"));
      item.classList.add("active");
      dom.themeDropdown.classList.add("hidden");

      showToast(`Theme: ${THEME_NAMES[theme]}`, "ri-palette-line");
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

function initQuickTools() {
  // Constant cards (π, e, φ, c)
  document.querySelectorAll(".constant-tile").forEach(tile => {
    tile.addEventListener("click", () => {
      const val = tile.dataset.val;
      state.currentInput = val;
      state.shouldResetInput = true;
      updateScreen();
      showToast(`Inserted ${tile.querySelector(".tile-name").textContent}`, "ri-sparkling-fill");
    });
  });

  // Quick % preset buttons (+10%, +15%, etc.)
  document.querySelectorAll(".preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const pct = parseFloat(btn.dataset.percent);
      const curr = parseFloat(state.currentInput) || 0;
      const res = curr + (curr * (pct / 100));
      const formatted = formatNumber(res);
      addHistoryItem(`${curr} + ${pct}%`, formatted);
      state.expressionPreview = `${curr} + ${pct}% =`;
      state.currentInput = formatted;
      state.shouldResetInput = true;
      updateScreen();
      showToast(`Applied +${pct}%`, "ri-percent-line");
    });
  });
}

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
  }, 2000);
}

function copyResultToClipboard() {
  const result = state.currentInput;
  if (!result || result === "Error") return;

  navigator.clipboard.writeText(result).then(() => {
    showToast(`Copied ${result} to clipboard!`, "ri-clipboard-line");
  }).catch(() => {
    showToast("Failed to copy", "ri-error-warning-line");
  });
}

// ====================================================================
// EVENT LISTENERS & KEYBOARD MAPPING
// ====================================================================

function initListeners() {
  // Keypad clicks
  document.querySelectorAll(".key").forEach(btn => {
    btn.addEventListener("click", () => {
      const val = btn.dataset.val;
      const action = btn.dataset.action;

      if (val !== undefined && action === undefined) {
        inputDigit(val);
      } else if (action === "operator") {
        handleOperator(val);
      } else if (action === "calculate") {
        handleEquals();
      } else if (action === "clear") {
        clearAll();
      } else if (action === "delete") {
        deleteLast();
      } else if (action) {
        handleScientificAction(action);
      }
    });
  });

  // Mode Tabs
  dom.tabStandard.addEventListener("click", () => {
    state.isScientific = false;
    dom.tabStandard.classList.add("active");
    dom.tabScientific.classList.remove("active");
    dom.scientificPanel.classList.add("hidden");
  });

  dom.tabScientific.addEventListener("click", () => {
    state.isScientific = true;
    dom.tabScientific.classList.add("active");
    dom.tabStandard.classList.remove("active");
    dom.scientificPanel.classList.remove("hidden");
  });

  // Sound toggle
  dom.soundToggleBtn.addEventListener("click", () => {
    state.soundEnabled = !state.soundEnabled;
    dom.soundToggleBtn.classList.toggle("active", state.soundEnabled);
    dom.soundToggleBtn.innerHTML = state.soundEnabled 
      ? `<i class="ri-volume-up-line"></i>` 
      : `<i class="ri-volume-mute-line"></i>`;
    showToast(state.soundEnabled ? "Audio Click Enabled" : "Muted", "ri-volume-up-line");
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
    if (dom.shortcutsModal.open) return;

    highlightPhysicalKey(e.key);

    if (e.key >= "0" && e.key <= "9") {
      inputDigit(e.key);
    } else if (e.key === ".") {
      inputDigit(".");
    } else if (["+", "-", "*", "/"].includes(e.key)) {
      e.preventDefault();
      handleOperator(e.key);
    } else if (e.key === "Enter" || e.key === "=") {
      e.preventDefault();
      handleEquals();
    } else if (e.key === "Backspace") {
      e.preventDefault();
      deleteLast();
    } else if (e.key === "Escape" || e.key.toLowerCase() === "c") {
      e.preventDefault();
      clearAll();
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
    setTimeout(() => btn.classList.remove("pressed"), 100);
  }
}

// --- Initialize App ---
function init() {
  initThemeSystem();
  initQuickTools();
  renderHistory();
  updateScreen();
  initListeners();
}

document.addEventListener("DOMContentLoaded", init);
