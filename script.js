/**
 * ====================================================================
 * OMNICALC PRO — HIGH-PERFORMANCE JAVASCRIPT ENGINE
 * Instant, Intuitive Standard & Scientific Calculator
 * ====================================================================
 */

// --- Calculator State ---
const state = {
  currentInput: "0",        // Current number shown in large display
  previousOperand: null,     // First operand before operator
  pendingOperator: null,     // Active operator ('+', '-', '*', '/')
  expressionPreview: "",     // Top formula line
  shouldResetInput: false,   // True after clicking an operator or "="
  isScientific: false,       // Scientific mode panel
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
// CORE CALCULATOR ACTIONS
// ====================================================================

/**
 * Handle Digits & Decimal Point
 */
function inputDigit(digit) {
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
  const inputValue = parseFloat(state.currentInput);

  // If an operator was already pending and user didn't enter a new number, just change the operator
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
  // Main big line shows the answer: "105"
  state.currentInput = `${resultFormatted}`;

  // Save to history tape
  addHistoryItem(`${prevFormatted} ${opSymbol} ${currFormatted}`, resultFormatted);

  state.previousOperand = null;
  state.pendingOperator = null;
  state.shouldResetInput = true;

  clearActiveOperatorHighlight();
  updateScreen();
}

/**
 * Core Arithmetic Calculation
 */
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
  state.currentInput = "0";
  state.previousOperand = null;
  state.pendingOperator = null;
  state.expressionPreview = "";
  state.shouldResetInput = false;
  clearActiveOperatorHighlight();
  updateScreen();
}

/**
 * Delete last digit (Backspace / DEL)
 */
function deleteLast() {
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
// UI PRESENTATION & SCREEN HELPERS
// ====================================================================

function updateScreen() {
  dom.expressionDisplay.textContent = state.expressionPreview;
  dom.resultDisplay.textContent = state.currentInput;

  // Auto-shrink font if number is long
  const len = state.currentInput.length;
  dom.resultDisplay.className = "result-line";
  if (len > 13) {
    dom.resultDisplay.classList.add("shrink-3");
  } else if (len > 9) {
    dom.resultDisplay.classList.add("shrink-2");
  } else if (len > 7) {
    dom.resultDisplay.classList.add("shrink-1");
  }
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
  // Fix 0.1 + 0.2 floating point issues
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
// THEME & TOAST FEEDBACK
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
  const result = dom.resultDisplay.textContent;
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

  // Scientific Mode Toggle
  dom.modeToggleBtn.addEventListener("click", () => {
    state.isScientific = !state.isScientific;
    dom.modeToggleBtn.classList.toggle("active", state.isScientific);
    dom.scientificPanel.classList.toggle("hidden", !state.isScientific);
    dom.calcCard.classList.toggle("scientific-active", state.isScientific);
    showToast(state.isScientific ? "Scientific Mode Enabled" : "Standard Mode", "ri-flask-line");
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
    if (dom.shortcutsModal.open) return;

    // Visual button press feedback
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
  renderHistory();
  updateScreen();
  initListeners();
}

document.addEventListener("DOMContentLoaded", init);
