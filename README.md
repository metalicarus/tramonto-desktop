```
____________________________  ______________   _______________ 
___  __/__  __ \__    |__   |/  /_  __ \__  | / /__  __/_  __ \
__  /  __  /_/ /_  /| |_  /|_/ /_  / / /_   |/ /__  /  _  / / /
_  /   _  _, _/_  ___ |  /  / / / /_/ /_  /|  / _  /   / /_/ / 
/_/    /_/ |_| /_/  |_/_/  /_/  \____/ /_/ |_/  /_/    \____/  
```

# Tramonto

> A privacy-first pentest management tool for security professionals. Built to run offline, sync via GitHub, and never expose sensitive client data.

---

## What is Tramonto?

Tramonto is a desktop and web application for organizing and archiving penetration testing engagements. It provides a structured, phase-based workflow aligned with OWASP testing guidelines, allowing testers to track controllers, register vulnerabilities, and generate professional reports — all without relying on a traditional backend.

Data is encrypted before leaving your machine. Collaboration happens through GitHub repositories, keeping infrastructure costs at zero.

---

## Features

- **Structured pentest workflow** — phase-based controllers (Reconnaissance, Authentication, Authorization, Session Management, Input Validation)
- **Vulnerability tracking** — severity levels, CVSS scoring, CWE/OWASP mapping, impact and recommendation fields
- **Three-layer persistence** — IndexedDB (runtime), encrypted JSON files (local), GitHub (remote/collaborative)
- **End-to-end encryption** — AES-GCM 256-bit encryption via master password before any data leaves your machine
- **Encrypted evidence** — screenshots and logs attached to vulnerabilities, encrypted at rest with a local vault key
- **Encrypted backup** — export/import every project and its evidence as a single `.tbak` file
- **Master password system** — PBKDF2 key derivation, recovery key, lockout policy with exponential backoff
- **Session timeout** — auto-lock after 15 minutes of inactivity
- **GitHub sync** — push encrypted project data to private repositories; teammates clone and decrypt locally (desktop app)
- **Sync status per item** — every controller and vulnerability shows whether it is synchronized; failed syncs can be retried
- **Project import** — clone and decrypt an existing repository to restore or collaborate on a project
- **Report generation** — executive and technical PDF reports via browser print
- **Anonymous customer codes** — auto-generated codenames (e.g. `naruto_yellow_teacher_sunday`) to avoid exposing real client names in documents
- **Cross-platform** — runs as Electron (Linux, Windows, macOS) or web app (Chromium-based browsers; GitHub sync is desktop-only for now)

---

## Architecture

### Persistence layers

```
Write → [IndexedDB]                  ← source of truth at runtime
Sync  → [GitHub]                     ← encrypted, collaborative, remote
```

IndexedDB stores plain data for fast access. Before pushing to GitHub, all project data is encrypted client-side using AES-GCM with a key derived from the master password via PBKDF2. The GitHub repository contains only ciphertext — unreadable without the master password.

### Adapter pattern

Tramonto uses an adapter pattern to handle environment differences:

```
src/utils/fileSystem/
├── index.js              ← public interface
├── detect.js             ← environment detection
└── adapters/
    ├── electron.js       ← Node.js via IPC bridge
    └── web.js            ← File System Access API (Chromium)

src/utils/git/
├── index.js
└── adapters/
    ├── electron.js       ← simple-git via IPC
    └── web.js            ← GitHub REST API via Octokit
```

### Security model

- Master password never persisted — stays in memory only
- GitHub token never written to `.git/config` — sent per command as an HTTP header, and never pushed to the repository
- Local evidence encrypted with a random vault key, wrapped by both the master password and the recovery key
- Key derivation: PBKDF2 (SHA-256, 310,000 iterations)
- Encryption: AES-GCM 256-bit with random salt and IV per file
- Password verification uses a separate derived key hash stored in IndexedDB
- Recovery via 24-word recovery key (generated once at setup)
- Lockout: 3 failed attempts → 30s → 5min → 1h

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| UI framework | Vue 3 + Quasar |
| State management | Pinia |
| Desktop runtime | Electron |
| Local storage | IndexedDB (idb) |
| Git operations | simple-git (Electron) / Octokit (web) |
| Encryption | Web Crypto API (AES-GCM + PBKDF2) |
| Build tool | Vite |

---

## Getting started

### Prerequisites

- Node.js 18+
- npm or yarn

### Install

```bash
git clone https://github.com/metalicarus/tramonto-desktop.git
cd tramonto
npm install
```

### Run (web)

```bash
quasar dev
```

> Note: GitHub sync in web mode requires a Chromium-based browser.

### Run (Electron)

```bash
quasar dev -m electron
```

### Build

```bash
# Web
quasar build

# Electron
quasar build -m electron
```

---

## Configuration

On first launch, you will be prompted to set a **master password**. A recovery key will be generated — store it somewhere safe. It will not be shown again.

GitHub token and repository URL are configured per project in the project settings panel.

---

## Todo

### Done

- [x] IndexedDB persistence layer
- [x] Adapter pattern for filesystem and git
- [x] Electron IPC bridge (fs + git handlers)
- [x] GitHub sync via simple-git (Electron)
- [x] AES-GCM encryption before push
- [x] Master password setup and verification
- [x] Recovery key generation
- [x] Lockout policy with exponential backoff
- [x] Session timeout (15 minutes)
- [x] Project import from remote repository
- [x] Anonymous customer code generator
- [x] Executive and technical PDF report generation
- [x] Frameless Electron window with custom titlebar
- [x] Vulnerability tracking with severity, CVSS, CWE, OWASP
- [x] Evidence attachments (screenshots, logs) per vulnerability, encrypted at rest
- [x] Full database export/import backup (encrypted)
- [x] Sync failure notification with retry
- [x] Per-item unsynced indicator in the UI

### Pending

- [ ] Per-project keys shared per member (instead of one shared master password)
- [ ] Encrypt IndexedDB records at rest
- [ ] Automated tests (unit + Electron end-to-end) in CI
- [ ] GitHub sync in web mode
- [ ] Merge conflict resolution for collaborative sessions
- [ ] Deletions propagated to the repository on sync
- [ ] Global search across controllers and vulnerabilities
- [ ] Audit log (who changed what and when)

---

## Security notes

Tramonto is designed for handling sensitive pentest data. A few important notes:

- Always use a **private** GitHub repository for project sync
- The master password is the single point of trust — choose a strong one
- Recovery keys should be stored offline (paper, password manager)
- The web version stores the filesystem handle in memory only — it is lost on page reload
- Backups are encrypted with the master password: restoring requires the same password used to create them
- Tramonto does not send telemetry or communicate with any server other than GitHub's API

---

## Contributing

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit your changes
4. Push and open a pull request

Each project syncs to its own repository — one repo per engagement — to maintain client isolation and access control.

---

## License

MIT + Commons Clause — free for personal and non-commercial use.
Commercial use requires explicit permission from the author.