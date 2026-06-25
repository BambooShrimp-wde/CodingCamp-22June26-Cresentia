# Budget & Expense Visualizer

A mobile-friendly web app that helps users track daily spending. It shows your total balance, a history of transactions, and a visual chart of spending by category.

Built with plain HTML, CSS, and vanilla JavaScript — no frameworks, no backend, no build step required. Just open `index.html` in your browser.

---

## Features

### Core (MVP)

- **Input Form** — Add an expense with an item name, amount, and category. All fields are validated before submission.
- **Transaction List** — Scrollable list of all added expenses showing the name, amount, category, and date. Each item can be deleted.
- **Total Balance Bar** — Displays your monthly budget, total spent, and remaining balance at the top. Updates automatically when transactions are added or deleted. The progress bar turns red when you go over budget.
- **Spending Chart** — Pie chart showing spending distribution by category using Chart.js. Updates live as transactions change, with a colour-coded legend below.
- **LocalStorage** — All data is saved in the browser. Your transactions, budget, and settings persist across page refreshes.

### Optional Challenges (3 of 5)

- **Dark / Light Mode Toggle** — Switch between a light sky theme and a dark night theme using the button in the header. Your preference is saved.
- **Custom Categories** — Add your own spending categories in Settings (⚙️) beyond the built-in ones (Food, Transport, Fun, Shopping, Bills & Utilities).
- **Spending Limit Highlight** — Set a per-item spending limit in Settings. Any transaction that exceeds the limit is flagged with a red warning badge in the list. A warning also appears inside the form before you submit.

---

## What I Added on My Own

These features go beyond the project requirements:

- **Animated Cloud Background (Light Mode)** — Cotton-like clouds made of layered radial gradients drift slowly across the sky. Each cloud is unique in size, shape, and speed, and wraps back around when it exits the screen.
- **Animated Star Field (Dark Mode)** — 280 individually placed stars with randomised size and opacity slowly twinkle at different rates, simulating a real night sky using canvas.
- **Sort Transactions** — Sort the transaction list by Date, Highest Amount, Lowest Amount, or A–Z using the buttons at the top of the list.
- **Configurable Budget** — Change your monthly budget at any time from the Settings modal. The summary bar and progress percentage update instantly.
- **Modal Animations** — Both the Add Expense and Settings modals slide up smoothly when opened. Press Escape to close them.
- **Empty States** — The chart and transaction list both show friendly placeholder text when there is nothing to display yet.
- **Mobile Responsive** — The two-column layout stacks into a single column on smaller screens.

---

## Project Structure

```
index.html        — App structure and both modals
css/
  style.css       — All styles, light and dark theme variables
js/
  app.js          — All logic: state, rendering, LocalStorage, canvas animations
```

---

## How to Run

No installation needed. Open `index.html` directly in any modern browser (Chrome, Firefox, Edge, Safari).

---

## Live Demo

Published via GitHub Pages: *(add your GitHub Pages link here once deployed)*
