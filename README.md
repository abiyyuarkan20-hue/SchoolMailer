# SchoolMailer — Aplikasi Surat SMAN 19 Medan

Sistem manajemen surat digital untuk SMA Negeri 19 Medan. Membuat, mengelola, dan mencetak surat keterangan siswa secara massal dengan template dinamis berbasis Handlebars.

---

## Fitur

- **Manajemen Template** — Editor WYSIWYG berbasis TipTap dengan variabel dinamis (`{{nama_siswa}}`, `{{kelas}}`, dll.)
- **Generate Surat Massal** — Output PDF/ZIP untuk ribuan siswa dalam sekali klik
- **Manajemen Siswa** — CRUD, import Excel/CSV, filter kelas
- **Manajemen Guru** — CRUD, import Excel/CSV, 14 field profil guru
- **Template Ranking** — Tabel peringkat dengan `{{#each ranking}}` untuk data ranking siswa
- **Multi Draft** — Auto-save draft, peringatan draft tersimpan, restore draft
- **Filter Template** — Filter berdasarkan tipe surat
- **Keamanan** — JWT (access + refresh token), audit log, validasi env, rate limiter, trust proxy
- **Audit Trail** — Catat login, logout, hapus massal, import data

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Frontend** | React 18, Vite, Tailwind CSS, TipTap (ProseMirror) |
| **Backend** | Node.js, Express, Prisma ORM |
| **Database** | PostgreSQL 15 |
| **Template Engine** | Handlebars |
| **Auth** | JWT (access + refresh token) |
| **Container** | Docker / docker-compose |

---

## Prerequisites

- Node.js 18+
- PostgreSQL 15 (atau jalankan via Docker)
- npm / yarn
- Git

---

## Instalasi

### 1. Clone & Install Dependencies

```bash
# Backend
cd apps/backend
cp .env.example .env
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Setup Database

**Opsi A — Docker (recommended):**
```bash
docker-compose up -d
```

**Opsi B — Manual:**
Buat database PostgreSQL bernama `schoolmailer_db`, lalu sesuaikan `DATABASE_URL` di `.env`.

### 3. Migrasi & Seed

```bash
cd apps/backend
npx prisma db push
npx prisma db seed
```

### 4. Jalankan Aplikasi

```bash
# Terminal 1 — Backend
cd apps/backend
npm run dev

# Terminal 2 — Frontend
cd apps/frontend
npm run dev
```

Akses frontend di `http://localhost:5173` dan backend di `http://localhost:3001`.

---

## Konfigurasi Environment

Lihat `apps/backend/.env.example` untuk daftar lengkap variabel yang dibutuhkan:

| Variabel | Deskripsi |
|----------|-----------|
| `DATABASE_URL` | URL koneksi PostgreSQL |
| `JWT_ACCESS_SECRET` | Secret token akses (min. 32 karakter) |
| `JWT_REFRESH_SECRET` | Secret token refresh (min. 32 karakter, berbeda) |
| `JWT_ACCESS_EXPIRES` | Masa berlaku access token (default: `15m`) |
| `JWT_REFRESH_EXPIRES` | Masa berlaku refresh token (default: `7d`) |
| `PORT` | Port server (default: `3001`) |
| `NODE_ENV` | Environment (`development` / `production`) |
| `FRONTEND_URL` | URL frontend untuk CORS |
| `OUTPUT_DIR` | Direktori output file generate |
| `TEMP_DIR` | Direktori temporary |
| `MAX_UPLOAD_SIZE_MB` | Maksimum upload (MB) |
| `OUTPUT_FILE_TTL_HOURS` | Masa berlaku file output (jam) |

> **Keamanan:** Jangan commit `.env` ke repository. Gunakan `.env.example` sebagai referensi.

---

## Struktur Project

```
schoolmailer/
├── apps/
│   ├── backend/
│   │   ├── prisma/              # Schema & migrasi database
│   │   ├── src/
│   │   │   ├── config/          # Validasi env, konfigurasi
│   │   │   ├── middleware/      # Auth, security, error handler
│   │   │   ├── modules/        # Modul (auth, students, templates, generator, dll.)
│   │   │   └── app.js          # Entry point Express
│   │   └── .env.example
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── components/     # Komponen UI reusable
│   │   │   ├── hooks/          # Custom hooks React
│   │   │   ├── pages/          # Halaman (TemplateEditor, Generate, dll.)
│   │   │   ├── services/       # API services
│   │   │   └── utils/          # Utility & extensions TipTap
│   │   └── .env
│   └── public/
├── docker-compose.yml
└── .gitignore
```

---

## API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/v1/auth/login` | Login user |
| `POST` | `/api/v1/auth/logout` | Logout (invalidate refresh token) |
| `POST` | `/api/v1/auth/refresh` | Refresh access token |
| `GET` | `/api/v1/auth/me` | Profile user saat ini |
| `GET` | `/api/v1/students` | List siswa (dengan filter) |
| `POST` | `/api/v1/students` | Tambah siswa |
| `POST` | `/api/v1/students/import` | Import siswa (Excel/CSV) |
| `DELETE` | `/api/v1/students` | Hapus semua siswa |
| `GET` | `/api/v1/teachers` | List guru |
| `POST` | `/api/v1/teachers` | Tambah guru |
| `POST` | `/api/v1/teachers/import` | Import guru (Excel/CSV) |
| `DELETE` | `/api/v1/teachers` | Hapus semua guru |
| `GET` | `/api/v1/templates` | List template |
| `POST` | `/api/v1/templates` | Buat template |
| `PUT` | `/api/v1/templates/:id` | Update template |
| `DELETE` | `/api/v1/templates/:id` | Hapus template |
| `POST` | `/api/v1/generator/generate` | Generate surat (PDF/ZIP) |
| `POST` | `/api/v1/generator/preview` | Preview surat |
| `GET` | `/api/v1/audit/logs` | Log audit |
| `DELETE` | `/api/v1/audit/logs` | Hapus log audit |

---

## Variabel Template

### Siswa
`{{nama_siswa}}`, `{{kelas}}`, `{{nisn}}`, `{{jenis_kelamin}}`, `{{nama_orang_tua}}`, `{{no_hp_ortu}}`, `{{alamat}}`, `{{tanggal_surat}}`

### Guru
`{{nama_guru}}`, `{{nip}}`, `{{jabatan}}`, `{{pangkat}}`, `{{mapel}}`, `{{nuptk}}`, `{{status_pegawai}}`, `{{pendidikan}}`, `{{tempat_lahir}}`, `{{tanggal_lahir}}`, `{{no_telp}}`, `{{email_guru}}`, `{{alamat_guru}}`, `{{jenis_kelamin_guru}}`

### Ranking (Loop)
```
{{#each ranking}}
  {{@index_1}} — nomor urut
  {{kelas_program}} — kelas/program
  {{semester}} — semester
  {{peringkat_siswa}} — peringkat/siswa
  {{tahun_pelajaran}} — tahun pelajaran
{{/each}}
```

---

## Keamanan

- **Env Validation** — Validasi environment variables saat startup (panic jika JWT secret < 32 karakter atau duplikat)
- **JWT dengan dua secret** — Access token (15m) dan refresh token (7d) dengan secret berbeda
- **Audit Log** — Semua aktivitas login, logout, hapus massal, dan import tercatat
- **Production Error Handler** — Error detail hanya ditampilkan di development
- **Security Headers** — HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, Cache-Control
- **Rate Limiter** — standardHeaders + legacyHeaders
- **Trust Proxy** — IP detection akurat di belakang reverse proxy
- **Body Limit** — 2mb untuk mencegah serangan DoS

---

## Lisensi

MIT
