# Wanzz Deploy — Menghubungkan ke Backend Asli (API Key Langsung)

Folder `/api` berisi 4 file, masing-masing berdiri sendiri per platform:

```
/api/github.js           → GET         → status koneksi + daftar repo asli
/api/vercel.js           → GET & POST  → status + deploy ASLI via Vercel REST API
/api/netlify.js          → GET & POST  → status + deploy ASLI via Netlify REST API
/api/status.js           → GET         → ringkasan status ketiganya (dipakai 3 kartu di dashboard)
/api/_lib/config.js      → SATU tempat isi semua token (GITHUB_TOKEN, VERCEL_TOKEN, VERCEL_TEAM_ID, NETLIFY_TOKEN)
/api/_lib/github-tree.js → helper internal, bukan route (dipakai netlify.js untuk ambil isi repo)
```

Semua pakai **API key (Personal Access Token) langsung** — bukan Deploy
Hook / Build Hook. Token diisi di satu file (`api/_lib/config.js`), atau
lewat environment variable di dashboard Vercel — tidak pernah ada di
kode frontend.

**PENTING:** Karena ini serverless function, seluruh project (root folder
ini) harus di-deploy sebagai **1 project Vercel**. Endpoint `/api/...`
tidak jalan kalau `index.html` cuma dibuka sebagai file lokal.

---

## Langkah 1 — Push project ini ke GitHub

```bash
git init
git add .
git commit -m "wanzz deploy - api key backend"
git branch -M main
git remote add origin https://github.com/USERNAME/wanzz-deploy.git
git push -u origin main
```

## Langkah 2 — Import ke Vercel

1. Buka https://vercel.com/new
2. Pilih repo GitHub yang tadi kamu push
3. Klik **Deploy** — Vercel otomatis mengenali `/api` sebagai serverless
   functions dan membaca `package.json` untuk install dependency
   (`jszip`, dipakai oleh `netlify.js`)

## Langkah 3 — Buat 3 API key

### GitHub Token
1. https://github.com/settings/tokens → **Generate new token (classic)**
2. Scope: centang **repo**
3. Generate, copy tokennya (`ghp_...`)

### Vercel Token
1. https://vercel.com/account/tokens → **Create Token**
2. Kasih nama bebas, scope default sudah cukup
3. Copy tokennya (hanya muncul sekali, simpan baik-baik)
4. (Opsional, kalau akun kamu pakai Team) — catat juga **Team ID** dari
   Vercel dashboard → Settings → General

### Netlify Token
1. https://app.netlify.com/user/applications → **Personal access tokens**
   → **New access token**
2. Kasih nama bebas, Generate
3. Copy tokennya

## Langkah 4 — Isi token di `api/_lib/config.js`

Buka file `api/_lib/config.js`, isi 4 baris di bagian `CONFIG`:

```js
const CONFIG = {
  GITHUB_TOKEN: "ghp_xxxxxxxxxxxx",
  VERCEL_TOKEN: "xxxxxxxxxxxxxxxx",
  VERCEL_TEAM_ID: "",
  NETLIFY_TOKEN: "xxxxxxxxxxxxxxxx",
};
```

Simpan, commit, push, redeploy (atau Vercel auto-redeploy kalau kamu
sudah menghubungkan repo GitHub-nya). Selesai — `api/github.js`,
`api/vercel.js`, `api/netlify.js`, `api/status.js` semuanya baca dari
file ini secara otomatis.

**Alternatif (disarankan kalau repo ini publik):** isi Environment
Variables dengan nama yang sama (`GITHUB_TOKEN`, `VERCEL_TOKEN`,
`VERCEL_TEAM_ID`, `NETLIFY_TOKEN`) di Vercel → Settings → Environment
Variables, dan biarkan `CONFIG` di file tetap kosong. `config.js`
otomatis memprioritaskan Environment Variable kalau ada isinya duluan.

⚠️ Kalau kamu isi token asli langsung di `config.js` **dan** repo ini
publik di GitHub, buka `.gitignore` di root project dan hapus tanda `#`
di depan baris `api/_lib/config.js` SEBELUM commit pertama, supaya
tokennya tidak ikut ter-push.


## Langkah 5 — Selesai

Buka URL project Wanzz Deploy kamu, tekan Quick Access. Panel API Status
akan menunjukkan status asli, panel Pilih Repository berisi repo asli
dari GitHub kamu, dan tombol Deploy benar-benar membuat deployment lewat
REST API Vercel/Netlify.

---

## Cara kerja tombol Deploy

**Kalau repo yang dipilih hasil upload lokal** (lewat panel Upload
Project → "Jadikan Repository"):
- Isi file (yang sudah kamu edit di editor full-screen) dikirim langsung
  dari browser ke `/api/vercel` atau `/api/netlify`.
- Vercel: dibuat deployment lewat `POST /v13/deployments` dengan file
  inline.
- Netlify: file di-zip di server (pakai `jszip`), lalu di-deploy lewat
  `PUT /sites/{id}/deploys` (zip deploy).

**Kalau repo yang dipilih adalah repo GitHub asli:**
- Vercel: pakai `gitSource` — Vercel sendiri yang menarik source langsung
  dari GitHub (butuh akun Vercel kamu sudah terhubung ke GitHub App,
  biasanya otomatis kalau kamu sign-in Vercel pakai GitHub).
- Netlify: server mengambil seluruh isi file repo lewat GitHub API
  (`GITHUB_TOKEN`), zip di server, lalu deploy dengan cara yang sama
  seperti mode upload.

---

## Batasan yang perlu kamu tahu

- **Ukuran repo dibatasi** (default: maks 80 file / ~4MB per deploy)
  supaya tidak timeout di serverless function. Untuk repo besar, deploy
  langsung dari dashboard Vercel/Netlify tetap lebih andal.
- **File biner di project upload** (gambar, font, dll) saat ini tidak
  ikut terkirim — hanya file bertipe teks yang didukung editor (html,
  css, js, json, dll). Kalau perlu file biner ikut ter-deploy, backend
  perlu ditambah dukungan base64 upload — kabari saya kalau ini
  diperlukan.
- **Tidak ada live build log** di dashboard ini. Setelah deployment
  dibuat, cek progres build & URL final langsung di dashboard
  Vercel/Netlify masing-masing (link `url` yang muncul di console log
  bisa langsung dibuka).
- **Vercel `gitSource`** butuh akun Vercel yang tokennya sudah punya
  akses GitHub App ke repo tersebut. Kalau gagal dengan error terkait
  akses repo, hubungkan dulu repo itu manual sekali lewat dashboard
  Vercel (Import Project), setelah itu API biasanya lancar.
