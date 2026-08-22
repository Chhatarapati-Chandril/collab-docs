<div align="center">

# collab-docs

**A real-time collaborative rich-text editor, built on CRDTs.**

Multiple users edit the same document simultaneously. Conflicts are resolved with **Yjs**, not last-write-wins — every client converges to the same state regardless of edit order or network delay.

[![Angular](https://img.shields.io/badge/Angular-DD0031?logo=angular&logoColor=white)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](#)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white)](#)
[![Yjs](https://img.shields.io/badge/CRDT-Yjs-4A90D9)](#)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?logo=socket.io&logoColor=white)](#)
[![PostgreSQL](https://img.shields.io/badge/Postgres-4169E1?logo=postgresql&logoColor=white)](#)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)](#)
[![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white)](#)

</div>

---

## Why this exists

Most "Google Docs clone" projects stop at CRUD with a rich-text field. The actual hard problem: many clients editing concurrently and converging correctly, is usually skipped. collab-docs is built around that problem, not around it:

- **CRDT sync**, not last-write-wins or a hand-rolled OT implementation
- **Permission enforcement at the WebSocket gateway**, not just hidden in the UI
- **Explicit handling of the ugly edge cases** — access revoked mid-edit, offline reconnect, server restarts mid-session

## How it works

```
┌────────────┐        Yjs updates          ┌────────────┐
│  Angular   │ ───────────────────────────▶│   NestJS   │
│  Quill     │◀─────────────────────────── │   Gateway  │
│  Yjs client│       Socket.IO room        │  (Yjs doc) │
└────────────┘                             └──────┬─────┘
                                                  │ permission check
                                                  │ on every update
                                                  ▼
                                        ┌────────────────────┐
                                        │ Postgres / Redis   │
                                        │ snapshots · auth   │
                                        └────────────────────┘
```

Each open document has one authoritative Yjs instance in server memory. Clients send local edits over Socket.IO; the gateway validates the sender's permission against the DB **before** applying and rebroadcasting, so a revoked editor's keystrokes never reach anyone else's screen. State is periodically snapshotted to Postgres and rehydrated on server restart.

## Features

| | |
|---|---|
| **Editing** | Live multi-cursor editing, headings, lists, blockquotes, code blocks, inline images |
| **Presence** | Cursor labels, top-bar avatars, anonymous mode (random name/avatar per session) |
| **Sharing** | Owner / Editor / Viewer roles, shareable links, direct email grant, access requests |
| **Auth** | JWT access + rotated refresh tokens, Redis-backed instant revocation |
| **Resilience** | Offline edit queueing with auto-sync on reconnect, mid-edit permission revocation handled live |

## Tech Stack

| | |
|---|---|
| **Frontend** | Angular (standalone, signals) · TipTap · Yjs · Socket.IO client |
| **Backend** | NestJS · Socket.IO Gateway · Prisma · `@nestjs/jwt` · `@nestjs/throttler` |
| **Data** | PostgreSQL (Supabase) · Redis (Redis Cloud) |
| **Deploy** | Vercel (frontend) · Railway / Render (backend) |

## Getting Started

```bash
git clone https://github.com/Chhatarapati-Chandril/collab-docs.git
cd collab-docs
```

**Backend**
```bash
cd server
npm install
npx prisma migrate dev
npm run start:dev
```

**Frontend**
```bash
cd client
npm install
npm start
```

## Project Structure

<pre>
collab-docs/
├── <a href="./client/">client/</a>         # Angular frontend
├── <a href="./server/">server/</a>         # NestJS backend
├── <a href="./wiki/">wiki/</a>           # Project architechture
├── <a href="./.husky/">.husky/</a>         # Git hooks
├── <a href="./.vscode/">.vscode/</a>        # VS Code configuration
├── <a href="./.gitignore">.gitignore</a>
├── <a href="./package.json">package.json</a>
├── <a href="./package-lock.json">package-lock.json</a>
└── <a href="./README.md">README.md</a>
</pre>
