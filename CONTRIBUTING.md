# Contributing to Kira Music Bot

Thank you for your interest in contributing to Kira! We welcome contributions to enhance functionality, improve performance, and expand the UI.

---

## 🛠️ Development Setup

1. **Fork & Clone:**
   ```bash
   git clone https://github.com/Nex-Devz/Kira-Music.git
   cd Kira-Music
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Copy `.env.example` to `.env` and set up your test bot token and local Lavalink v4 node credentials.

---

## 📐 Coding Guidelines

1. **Components V2 First**: Never use legacy Discord Embeds. All responses, modals, and menus must use the Discord Components V2 builders in `src/ui/componentsV2.js`.
2. **Minimal & Clean Aesthetics**: Do not add unnecessary emoji clutter. Adhere to the established dark typography and subtle accent borders.
3. **Unified Execution Context**: Commands must take `context` as their sole execution argument and use `CommandContext` methods so Slash, Prefix, and No-Prefix commands share identical logic.
4. **Structured Namespacing**: Any interactive button, select, or modal custom ID must follow `namespace:action:params` format and be routed in `InteractionRouter.js`.
5. **No Stack Trace Leaks**: All user-facing error reporting must pass through `ErrorHandler.js`.

---

## 🚀 Submitting Pull Requests

1. Create a feature branch: `git checkout -b feature/my-cool-feature`
2. Commit your changes with descriptive commit messages.
3. Open a Pull Request on GitHub against the `main` branch.
