# CodeAlpha Internship — Task 2: Advanced Precision Calculator (OmniCalc Pro)

![Project Status](https://img.shields.io/badge/Status-Completed-success?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS-blue?style=for-the-badge)
![Responsive](https://img.shields.io/badge/Design-Fully%20Responsive-purple?style=for-the-badge)

A modern, high-precision standard and scientific calculator engineered with clean semantic HTML5, modern CSS3 layout and animations, and vanilla JavaScript for the **CodeAlpha Frontend Development Internship**.

---

## 📸 Key Features

### 1. Core Arithmetic Operations
- ✅ Full support for **Addition (`+`)**, **Subtraction (`−`)**, **Multiplication (`×`)**, and **Division (`÷`)**.
- ✅ Clean handling of floating-point arithmetic (eliminates standard JS precision issues like `0.1 + 0.2`).
- ✅ Division-by-zero protection with intuitive error handling.
- ✅ Backspace / single-digit deletion (`DEL`) and full reset (`AC`).

### 2. Dual Mode: Standard & Scientific Engine
- 📐 **Trigonometric Functions:** `sin`, `cos`, `tan` (computed in degrees).
- 🔬 **Powers & Roots:** Square root (`√`), power exponents (`xʸ`).
- 📊 **Logarithms:** Common logarithm (`log`), natural logarithm (`ln`).
- ⚡ **Constants & Advanced Math:** Factorial (`n!`), Pi (`π`), Euler’s Number (`e`), percentage (`%`), sign negation (`±`), and parentheses (`(` and `)`).

### 3. Real-Time Result & Formula Display
- **Dual-Line Screen:** Shows the current mathematical expression on the top line and real-time live preview before clicking `=`.
- **Dynamic Auto-Scaling Typography:** The display dynamically adjusts font size when numbers grow large to prevent layout overflow.

### 4. Calculation History Tape
- Slide-out history tape that records all past calculations with timestamps.
- **One-Click Recall:** Click any past answer to instantly load it into the active calculation.
- Persisted locally in browser `localStorage`.

### 5. 5 Dynamic Multi-Themes
- 🌌 **Midnight Obsidian:** Deep dark sleek slate with electric indigo glow.
- ⚡ **Cyberpunk Neon:** Vibrant magenta and electric cyan laser theme.
- 🌿 **Emerald Aurora:** Nordic deep emerald and mint green glow.
- 🌅 **Sunset Dusk:** Rich amber, golden honey, and warm crimson dusk.
- ☀️ **Luxe Light:** Apple-inspired editorial titanium white and crisp charcoal.

### 6. Tactile Audio Feedback & Complete Keyboard Support
- **Web Audio API Click:** Pleasant mechanical click synthesized natively without any external MP3 files.
- **Physical Keyboard Integration:** Full support for `0-9`, `+`, `-`, `*`, `/`, `Enter`, `=`, `Backspace`, `Esc`, `c`, `(`, `)`, `%` with visual key depression feedback.
- **One-Click Copy:** Copy current answer to clipboard with toast notification.

---

## 📂 Project Directory Structure

```text
CodeAlpha_Calculator/
├── index.html       # Semantic calculator layout, screen display, and keypad
├── styles.css       # Neumorphic design system, 5 multi-themes, button animations
├── script.js        # Math engine, scientific evaluation, history tape, audio synthesis
└── README.md        # Complete project documentation
```

---

## ⌨️ Keyboard Shortcuts Guide

| Key | Action |
|---|---|
| <kbd>0</kbd> – <kbd>9</kbd> | Number input |
| <kbd>.</kbd> | Decimal point |
| <kbd>+</kbd> <kbd>-</kbd> <kbd>*</kbd> <kbd>/</kbd> | Arithmetic operators |
| <kbd>Enter</kbd> or <kbd>=</kbd> | Compute calculation |
| <kbd>Backspace</kbd> | Delete last character |
| <kbd>Esc</kbd> or <kbd>C</kbd> | Clear screen (AC) |
| <kbd>(</kbd> <kbd>)</kbd> | Parentheses |
| <kbd>%</kbd> | Percentage |

---

## 🚀 How to Run Locally

Built with zero external dependencies.

1. Clone repository:
   ```bash
   git clone https://github.com/manish-341/CodeAlpha_Calculator.git
   ```
2. Navigate into folder:
   ```bash
   cd CodeAlpha_Calculator
   ```
3. Open `index.html` in your browser (Chrome, Edge, Firefox, Safari).

---

## 🛠️ Built With

- **HTML5:** Semantic buttons, dialogs, accessible ARIA attributes.
- **CSS3:** Custom properties (CSS variables), Grid layout, glassmorphism, micro-animations.
- **JavaScript (ES6+):** Pure vanilla JavaScript, Web Audio API, LocalStorage API, Clipboard API.

---

## 👨‍💻 Author
- **Developer:** Manish Kumar
- **Internship:** CodeAlpha Frontend Development Internship
- **Task:** Task 2 — Build a Calculator
