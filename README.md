# Frame — Draw ERD

> **Visual database schema designer powered by DBML.**
> Write DBML on the left, see your Entity-Relationship Diagram update live on the right.

---

> [!WARNING]
> **Disclaimer — Vibe Coded Project**
> This project was built through _vibe coding_ — an experimental, AI-assisted development process where features were designed and implemented iteratively through natural-language conversation with an AI pair programmer. The codebase may not follow conventional software-engineering best practices and is provided as-is, without guarantees of production readiness. Use at your own discretion.

---

## Features

| Feature                     | Description                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------ |
| **Live DBML Editor**        | Syntax-highlighted CodeMirror editor with real-time parsing and error feedback       |
| **Interactive ERD Canvas**  | Drag, zoom, and pan a fully interactive React Flow diagram                           |
| **Editable Relationships**  | Draw connections by dragging field handles; delete or reconnect edges visually       |
| **Orthogonal Edge Routing** | Edges route in horizontal/vertical segments only — reshapeable by dragging waypoints |
| **Edge Color Picker**       | Hover an edge → click the cog to change its color from a preset palette              |
| **Field Hover Tooltip**     | Hover a field row to see its `note`, `default` value, and `enum` values in a popover |
| **Enum Nodes**              | Enum types rendered as separate nodes, toggleable from the toolbar                   |
| **Group Selection**         | Toggle select mode to rubber-band select multiple nodes at once                      |
| **Table Header Colors**     | Click the palette icon on any table header to change its accent color                |
| **Edge Animation**          | Toggleable flowing-dash animation showing relationship direction                     |
| **Minimap**                 | Toggleable minimap for navigating large schemas                                      |
| **Export PNG**              | Export the current diagram as a high-resolution PNG                                  |
| **Export SQL DDL**          | Generate SQL DDL from your DBML for PostgreSQL, MySQL, or MSSQL                      |
| **Copy DBML**               | Copy the raw DBML source to clipboard                                                |
| **Dark Mode**               | Full dark/light theme toggle, persisted to localStorage                              |
| **Canvas Controls**         | Custom zoom in/out, fit view, pan/select mode toggle, and canvas lock                |

---

## Tech Stack

- **[React 19](https://react.dev/)** — UI framework
- **[@xyflow/react](https://reactflow.dev/)** (React Flow v12) — interactive diagram canvas
- **[@dbml/core](https://dbml.dbdiagram.io/docs/)** — DBML parser and SQL exporter
- **[CodeMirror 6](https://codemirror.net/)** — code editor
- **[Zustand](https://zustand-demo.pmnd.rs/)** — global state management
- **[Dagre](https://github.com/dagrejs/dagre)** — automatic graph layout
- **[Tailwind CSS](https://tailwindcss.com/)** — styling
- **[Lucide React](https://lucide.dev/)** — icons
- **[Vite](https://vitejs.dev/)** — build tool

---

## Prerequisites
- Node.js (untuk local dev): versi terbaru (disarankan Node 20+)
- Docker Desktop + Docker Compose (untuk quick start via Docker)

## Local Development
1. Setup environment
   - Copy environment untuk frontend & docker variables:
     - `cp .env.example .env`
   - Untuk backend development lokal, buat env juga di folder backend:
     - `cp backend/.env.example backend/.env`
2. Jalankan frontend
```bash
cd /Users/azzamydev/Library/frame
npm ci
npm run dev
```
3. Jalankan backend
```bash
cd backend
npm ci

# (Opsional saat pertama kali/struktur skema berubah)
npm run db:generate
npm run db:migrate

npm run dev
```

## Docker Quick Access
Disarankan karena akan menangani build frontend/backend + migrasi DB otomatis saat container backend start.

1. Setup `.env`
```bash
cp .env.example .env
```
Pastikan wajib diisi:
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
Opsional:
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (untuk login GitHub)
- `ANTHROPIC_API_KEY` (untuk fitur AI)

2. Jalankan
```bash
docker compose up -d --build
```

3. Akses aplikasi
- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:4000/api`

## Catatan Database (Postgres)
- Postgres hanya membuat database saat **volume data** masih kosong.
- Jika Anda mengubah `POSTGRES_DB` setelah `pgdata` terbentuk, DB lama tidak akan dibuat ulang otomatis. Reset volumenya:
```bash
docker compose down -v
docker compose up -d --build
```

---

## DBML Quick Reference

```dbml
Enum order_status {
  pending
  processing
  shipped
  delivered [note: 'Final state']
}

Table users {
  id       integer     [pk, increment]
  username varchar     [not null, unique]
  email    varchar     [not null, unique]
  role     varchar     [default: 'member', note: 'member or admin']
  created_at timestamp [not null, default: `now()`]
}

Table orders {
  id         integer      [pk, increment]
  user_id    integer      [not null]
  status     order_status [not null, default: 'pending']
  total      decimal      [not null]
  created_at timestamp
}

Ref: orders.user_id > users.id
```

Full DBML language reference → **[dbml.dbdiagram.io/docs](https://dbml.dbdiagram.io/docs/)**

---

## Credits

- Inspired by **[dbdiagram.io](https://dbdiagram.io)** — the original DBML-based ERD tool by Holistics
- DBML (Database Markup Language) is an open-source spec created by the Holistics team

---

## License

MIT
