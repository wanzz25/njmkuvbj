/* =========================================================
   WANZZ DEPLOY — client logic (REAL BACKEND)
   Semua status koneksi & proses deploy di file ini memanggil
   endpoint /api/... milik server sendiri (lihat folder /api).
   Token/secret asli TIDAK PERNAH ada di file ini — hanya hidup
   di Environment Variables server (baca README-BACKEND.md).
   ========================================================= */

(() => {
  "use strict";

  const API_BASE = ""; // same-origin; endpoint /api/status, /api/github, /api/vercel, /api/netlify

  let githubUser = "wanzz-dev"; // fallback sebelum status asli didapat dari server
  let STATUS = {
    github:  { configured: false, status: "CHECKING..." },
    vercel:  { configured: false, status: "CHECKING..." },
    netlify: { configured: false, status: "CHECKING..." },
  };

  /* ---------- particle background canvas ---------- */
  const canvas = document.getElementById("bg-canvas");
  const ctx = canvas.getContext("2d");
  let particles = [];

  function resizeCanvas(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  function initParticles(count){
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.6 + 0.4,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      a: Math.random() * 0.5 + 0.15,
    }));
  }
  function tickParticles(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(150,149,156,${p.a * 0.5})`;
      ctx.fill();
    });
    requestAnimationFrame(tickParticles);
  }
  resizeCanvas();
  initParticles(Math.min(90, Math.floor((window.innerWidth * window.innerHeight) / 14000)));
  tickParticles();
  window.addEventListener("resize", () => { resizeCanvas(); initParticles(particles.length); });

  /* ---------- banner floating particles (DOM based) ---------- */
  function spawnBannerParticles(){
    const host = document.getElementById("banner-particles");
    if (!host) return;
    for (let i = 0; i < 22; i++){
      const s = document.createElement("span");
      s.style.left = Math.random() * 100 + "%";
      s.style.bottom = "-10px";
      s.style.animationDuration = 4 + Math.random() * 5 + "s";
      s.style.animationDelay = Math.random() * 6 + "s";
      host.appendChild(s);
    }
  }

  /* ---------- ambil status koneksi ASLI dari server ---------- */
  async function fetchRealStatus(){
    try {
      const res = await fetch(`${API_BASE}/api/status`);
      if (!res.ok) throw new Error("status endpoint error " + res.status);
      const data = await res.json();
      STATUS = data;
      if (data.githubUser) githubUser = data.githubUser;
    } catch (err) {
      // Backend belum terpasang / belum dideploy sebagai Vercel project —
      // tampilkan apa adanya sebagai NOT CONFIGURED, jangan pura-pura.
      STATUS = {
        github:  { configured: false, status: "NOT CONFIGURED" },
        vercel:  { configured: false, status: "NOT CONFIGURED" },
        netlify: { configured: false, status: "NOT CONFIGURED" },
      };
      console.warn("[wanzz-deploy] Gagal memuat /api/status:", err);
    }
  }

  function renderStatusUI(){
    const navUser = document.getElementById("nav-user");
    if (navUser) navUser.textContent = `◆ ${githubUser} — Quick Session Aktif`;

    const cardMap = [
      { sel: ".api-card:nth-child(1)", data: STATUS.github,  hint: "GITHUB_TOKEN" },
      { sel: ".api-card:nth-child(2)", data: STATUS.vercel,  hint: "VERCEL_TOKEN" },
      { sel: ".api-card:nth-child(3)", data: STATUS.netlify, hint: "NETLIFY_TOKEN" },
    ];
    cardMap.forEach(({ sel, data, hint }) => {
      const card = document.querySelector(sel);
      if (!card) return;
      const stateEl = card.querySelector(".api-state");
      const hintEl  = card.querySelector(".api-key-hint");
      const ok = data && data.configured;
      if (hintEl) hintEl.textContent = ok ? "env: " + hint + " ✓" : "env: " + hint + " — belum diatur";
      if (stateEl){
        stateEl.innerHTML = `<span class="led"></span> ${data ? data.status : "NOT CONFIGURED"}`;
        stateEl.style.color = ok ? "" : "var(--danger)";
        const led = stateEl.querySelector(".led");
        if (led && !ok){
          led.style.background = "var(--danger)";
          led.style.animation = "none";
        }
      }
    });
  }

  /* ---------- ambil daftar repo ASLI dari GitHub lewat server ---------- */
  async function loadRealRepos(){
    const repoGrid = document.getElementById("repo-grid");
    if (!repoGrid) return;
    try {
      const res = await fetch(`${API_BASE}/api/github`);
      const data = await res.json();
      if (!data.configured){
        return; // GITHUB_TOKEN belum diatur di server — biarkan kartu demo saja
      }
      if (data.error){
        console.warn("[wanzz-deploy] /api/github error:", data.error, data.detail);
        return;
      }
      if (!data.repos || data.repos.length === 0) return;

      // hapus kartu demo, ganti dengan repo asli
      repoGrid.innerHTML = "";
      data.repos.forEach((r, i) => {
        const card = document.createElement("div");
        card.className = "repo-card";
        card.dataset.repo = r.fullName;
        card.innerHTML = `
          <span class="repo-dot"></span>
          <div class="repo-meta">
            <span class="repo-name" data-name="${r.name}">${r.name}</span>
            <span class="repo-branch">${r.branch} · ${r.language}${r.private ? " · private" : ""}</span>
          </div>
          <button class="repo-rename-btn" title="Ganti nama tampilan">✎</button>
        `;
        bindRepoCard(card);
        repoGrid.appendChild(card);
        if (i === 0) selectRepoCard(card);
      });
    } catch (err) {
      console.warn("[wanzz-deploy] Gagal memuat /api/github:", err);
    }
  }

  /* ---------- screen references ---------- */
  const landingPage   = document.getElementById("landing-page");
  const loadingScreen = document.getElementById("loading-screen");
  const dashboard      = document.getElementById("dashboard");
  const quickAccessBtn = document.getElementById("quick-access-btn");

  const percentNum   = document.getElementById("percent-num");
  const barFill       = document.getElementById("loading-bar-fill");
  const loadingStatus = document.getElementById("loading-status");
  const bootLog        = document.getElementById("boot-log");

  const LOADING_STEPS = [
    { at: 0,  msg: "INITIALIZING SECURE CHANNEL...",     log: "[core] booting wanzz-deploy runtime" },
    { at: 18, msg: "MENGHUBUNGI SERVER BACKEND...",       log: "[api] GET /api/status" },
    { at: 45, msg: "MEMVERIFIKASI KREDENSIAL SERVER...",  log: "[env] reading server environment variables" },
    { at: 70, msg: "MENGAMBIL REPOSITORY...",             log: "[api] GET /api/github" },
    { at: 88, msg: "MENYIAPKAN DASHBOARD...",             log: "[ui] compiling dashboard modules" },
    { at: 100,msg: "AKSES DIBERIKAN. SELAMAT DATANG.",    log: "[core] ready" },
  ];

  function runLoadingSequence(){
    let pct = 0;
    let stepIndex = 0;
    bootLog.innerHTML = "";

    // mulai fetch status & repo asli paralel dengan animasi loading
    const statusPromise = fetchRealStatus().then(loadRealRepos);

    const interval = setInterval(() => {
      pct += Math.random() * 4 + 2;
      if (pct >= 100) pct = 100;

      percentNum.textContent = Math.floor(pct);
      barFill.style.width = pct + "%";

      while (stepIndex < LOADING_STEPS.length && pct >= LOADING_STEPS[stepIndex].at){
        const step = LOADING_STEPS[stepIndex];
        loadingStatus.textContent = step.msg;
        const line = document.createElement("div");
        line.textContent = "> " + step.log;
        bootLog.appendChild(line);
        bootLog.scrollTop = bootLog.scrollHeight;
        stepIndex++;
      }

      if (pct >= 100){
        clearInterval(interval);
        statusPromise.finally(() => setTimeout(enterDashboard, 400));
      }
    }, 110);
  }

  function enterDashboard(){
    loadingScreen.classList.add("hidden");
    dashboard.classList.remove("hidden");
    spawnBannerParticles();
    renderStatusUI();
  }

  quickAccessBtn.addEventListener("click", () => {
    landingPage.classList.add("hidden");
    loadingScreen.classList.remove("hidden");
    percentNum.textContent = "0";
    barFill.style.width = "0%";
    runLoadingSequence();
  });

  /* ---------- repository selector ---------- */
  const repoGrid = document.getElementById("repo-grid");
  const selectedRepoLabel = document.getElementById("selected-repo-label");
  let selectedRepo = null;

  function selectRepoCard(card){
    document.querySelectorAll(".repo-card").forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");
    selectedRepo = card.dataset.repo;
    selectedRepoLabel.textContent = selectedRepo;
  }

  function bindRepoCard(card){
    card.addEventListener("click", (e) => {
      if (e.target.closest(".repo-rename-btn")) return; // jangan trigger select saat rename
      selectRepoCard(card);
    });
    const renameBtn = card.querySelector(".repo-rename-btn");
    if (renameBtn) renameBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      startRenameRepo(card);
    });
  }

  function startRenameRepo(card){
    const nameEl = card.querySelector(".repo-name");
    nameEl.setAttribute("contenteditable", "true");
    nameEl.focus();
    const range = document.createRange();
    range.selectNodeContents(nameEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    function finishRename(){
      nameEl.removeAttribute("contenteditable");
      let newName = nameEl.textContent.trim();
      if (!newName) newName = nameEl.dataset.name || "project";
      newName = newName.replace(/\s+/g, "-");
      nameEl.textContent = newName;
      nameEl.dataset.name = newName;

      // catatan: ini hanya mengganti LABEL tampilan di kartu, bukan nama
      // repo asli di GitHub. Untuk repo hasil /api/github, deploy tetap
      // memakai data-repo (full name asli) yang tidak berubah kecuali
      // kartu itu berasal dari upload project lokal.
      if (card.dataset.repoSource === "upload"){
        const oldRepo = card.dataset.repo || "";
        const owner = oldRepo.includes("/") ? oldRepo.split("/")[0] : (githubUser || "wanzz-dev");
        card.dataset.repo = `${owner}/${newName}`;
      }

      if (card.classList.contains("selected")){
        selectedRepo = card.dataset.repo;
        selectedRepoLabel.textContent = selectedRepo;
      }
      nameEl.removeEventListener("blur", finishRename);
      nameEl.removeEventListener("keydown", onKeydown);
    }
    function onKeydown(e){
      if (e.key === "Enter"){ e.preventDefault(); nameEl.blur(); }
      if (e.key === "Escape"){ nameEl.textContent = nameEl.dataset.name; nameEl.blur(); }
    }
    nameEl.addEventListener("blur", finishRename, { once: true });
    nameEl.addEventListener("keydown", onKeydown);
  }

  document.querySelectorAll(".repo-card").forEach(bindRepoCard);

  /* tambahkan / perbarui satu kartu repo khusus untuk project yang diupload */
  function addUploadedRepoCard(name, meta){
    let card = repoGrid.querySelector('.repo-card[data-repo-source="upload"]');
    if (!card){
      card = document.createElement("div");
      card.className = "repo-card";
      card.dataset.repoSource = "upload";
      card.innerHTML = `<span class="repo-dot"></span><div class="repo-meta"><span class="repo-name"></span><span class="repo-branch"></span></div><button class="repo-rename-btn" title="Ganti nama">✎</button>`;
      bindRepoCard(card);
      repoGrid.appendChild(card);
    }
    const displayName = name.includes("/") ? name.split("/").pop() : name;
    card.dataset.repo = name;
    card.querySelector(".repo-name").textContent = displayName;
    card.querySelector(".repo-name").dataset.name = displayName;
    card.querySelector(".repo-branch").textContent = meta;
    selectRepoCard(card);
    card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* ---------- console log ---------- */
  const consoleBody = document.getElementById("console-body");

  function pushConsoleLine(text, cls = "", withCursor = false){
    const oldCursor = consoleBody.querySelector(".console-cursor");
    if (oldCursor) oldCursor.remove();

    const line = document.createElement("div");
    line.className = "console-line " + cls;
    line.textContent = text;
    if (withCursor){
      const cursor = document.createElement("span");
      cursor.className = "console-cursor";
      line.appendChild(cursor);
    }
    consoleBody.appendChild(line);
    consoleBody.scrollTop = consoleBody.scrollHeight;
    return line;
  }

  function clearConsole(){
    consoleBody.innerHTML = "";
  }

  function delay(ms){ return new Promise(res => setTimeout(res, ms)); }

  /* ---------- proses deploy ASLI ----------
     Memanggil /api/vercel atau /api/netlify di server, yang langsung
     memakai VERCEL_TOKEN / NETLIFY_TOKEN (API key) untuk membuat
     deployment sungguhan lewat REST API resmi masing-masing platform —
     bukan webhook. Kalau repo yang dipilih berasal dari upload lokal,
     isi filenya dikirim langsung; kalau dari GitHub, server yang
     mengambil isinya sendiri pakai GITHUB_TOKEN. */
  async function runDeploySequence(target, btn){
    const targetKey = target.toLowerCase();
    const keyInfo = STATUS[targetKey];

    if (!keyInfo || !keyInfo.configured){
      clearConsole();
      pushConsoleLine(`$ wanzz deploy --target=${targetKey}`, "");
      pushConsoleLine(`✗ ${target} belum dikonfigurasi di server.`, "err");
      pushConsoleLine(`  Set environment variable ${targetKey === "vercel" ? "VERCEL_TOKEN" : "NETLIFY_TOKEN"} di dashboard Vercel project ini, lalu redeploy.`, "warn");
      pushConsoleLine("  Lihat README-BACKEND.md untuk langkah lengkap.", "warn");
      return;
    }
    if (!selectedRepo){
      clearConsole();
      pushConsoleLine(`$ wanzz deploy --target=${targetKey}`, "");
      pushConsoleLine("✗ Belum ada repository yang dipilih.", "err");
      pushConsoleLine("  Pilih salah satu kartu di panel 'Pilih Repository' dulu.", "warn");
      return;
    }

    const otherBtns = document.querySelectorAll(".deploy-btn");
    otherBtns.forEach(b => b.classList.add("is-loading"));
    clearConsole();

    const isUploadedRepo = repoGrid.querySelector('.repo-card[data-repo-source="upload"]')?.dataset.repo === selectedRepo;
    const projectDisplayName = selectedRepo.includes("/") ? selectedRepo.split("/").pop() : selectedRepo;

    pushConsoleLine(`$ wanzz deploy --target=${targetKey}`, "");
    await delay(200);
    pushConsoleLine(`Repository terpilih: ${selectedRepo}`, "dim");
    await delay(300);

    let payload;
    if (isUploadedRepo){
      const usableFiles = uploadedProject.files.filter(f => f.editable && f.content != null);
      const skipped = uploadedProject.files.length - usableFiles.length;
      if (usableFiles.length === 0){
        pushConsoleLine("✗ Tidak ada file teks yang bisa dikirim dari project upload ini.", "err");
        otherBtns.forEach(b => b.classList.remove("is-loading"));
        return;
      }
      pushConsoleLine(`Menyiapkan ${usableFiles.length} file dari project lokal${skipped ? ` (${skipped} file biner dilewati)` : ""}...`, "info");
      await delay(400);
      payload = {
        mode: "files",
        [targetKey === "vercel" ? "projectName" : "siteName"]: projectDisplayName,
        files: usableFiles.map(f => ({ path: f.name, content: f.content })),
      };
    } else {
      pushConsoleLine(`Server akan mengambil isi repo langsung dari GitHub (${selectedRepo})...`, "info");
      await delay(400);
      payload = {
        mode: targetKey === "vercel" ? "git" : "repo",
        [targetKey === "vercel" ? "projectName" : "siteName"]: projectDisplayName,
        repoFullName: selectedRepo,
        ref: "main",
      };
    }

    pushConsoleLine(`Memanggil server (POST /api/${targetKey}) dengan API key...`, "info");
    await delay(250);

    try {
      const res = await fetch(`${API_BASE}/api/${targetKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.ok){
        pushConsoleLine(`✗ Deploy gagal: ${data.error || res.statusText}`, "err");
        if (data.detail) pushConsoleLine("  " + JSON.stringify(data.detail).slice(0, 220), "dim");
      } else {
        pushConsoleLine(`✓ Deployment dibuat lewat ${target} REST API (bukan webhook)`, "ok");
        await delay(250);
        if (data.url){
          pushConsoleLine(`✓ URL: ${data.url}`, "ok");
        }
        if (data.readyState) pushConsoleLine(`  status build: ${data.readyState}`, "dim");
        if (data.state) pushConsoleLine(`  status build: ${data.state}`, "dim");
      }
    } catch (err) {
      pushConsoleLine(`✗ Gagal menghubungi /api/${targetKey} — pastikan situs ini dideploy sebagai Vercel project (bukan dibuka sebagai file lokal).`, "err");
      pushConsoleLine("  " + String(err), "dim");
    }

    pushConsoleLine("", "", true);
    otherBtns.forEach(b => b.classList.remove("is-loading"));
  }

  document.querySelectorAll(".deploy-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      runDeploySequence(target, btn);
    });
  });

  /* ---------- upload project + edit file (client-side only) ----------
     File apapun yang diupload di sini TIDAK dikirim ke server manapun.
     Untuk .zip, isinya dibaca & diekstrak langsung di browser memakai
     JSZip. File bertipe teks (html/css/js/json/dll) bisa diklik untuk
     membuka editor full-screen sebelum dijadikan repository. */
  const dropzone       = document.getElementById("dropzone");
  const fileInput       = document.getElementById("file-input");
  const uploadResult    = document.getElementById("upload-result");
  const uploadFileName  = document.getElementById("upload-file-name");
  const uploadFileList  = document.getElementById("upload-file-list");
  const uploadClearBtn  = document.getElementById("upload-clear-btn");
  const uploadUseBtn    = document.getElementById("upload-use-btn");
  const projectNameInput = document.getElementById("upload-project-name-input");

  const TEXT_EXTENSIONS = ["html","htm","css","js","json","txt","md","svg","xml","yml","yaml"];

  let uploadedProject = { sourceName: null, files: [] };

  function isEditableExt(name){
    const ext = name.split(".").pop().toLowerCase();
    return TEXT_EXTENSIONS.includes(ext);
  }

  function formatBytes(bytes){
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function readFileAsText(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  function renderFileRow(fileObj, index){
    const row = document.createElement("div");
    row.className = "upload-file-row";
    row.style.animationDelay = (index * 0.04) + "s";
    const editHint = fileObj.editable ? `<span class="f-edit-hint">✎ klik untuk edit</span>` : "";
    const editedBadge = fileObj.edited ? `<span class="f-edited-badge">EDITED</span>` : "";
    row.innerHTML = `
      <span class="f-name">${fileObj.name}${editedBadge}</span>
      <span class="f-meta"><span class="f-size">${formatBytes(fileObj.size)}</span>${editHint}</span>
    `;
    if (fileObj.editable){
      row.addEventListener("click", () => openFullscreenEditor(fileObj));
    }
    return row;
  }

  function rerenderFileList(){
    uploadFileList.innerHTML = "";
    uploadedProject.files.forEach((f, i) => uploadFileList.appendChild(renderFileRow(f, i)));
    uploadUseBtn.classList.toggle("hidden", uploadedProject.files.length === 0);
  }

  /* ---------- fullscreen code editor (GitHub-style, CodeMirror) ---------- */
  const editorOverlay   = document.getElementById("editor-overlay");
  const editorFileName  = document.getElementById("editor-file-name");
  const editorLangBadge = document.getElementById("editor-lang-badge");
  const editorCmHost    = document.getElementById("editor-cm-host");
  const editorSaveBtn   = document.getElementById("editor-save-btn");
  const editorCancelBtn = document.getElementById("editor-cancel-btn");

  let cmInstance = null;

  function getLangForFile(name){
    const ext = name.split(".").pop().toLowerCase();
    switch (ext){
      case "html": case "htm": return { mode: "htmlmixed", label: "HTML" };
      case "css":               return { mode: "css", label: "CSS" };
      case "js":                return { mode: "javascript", label: "JavaScript" };
      case "json":               return { mode: { name: "javascript", json: true }, label: "JSON" };
      case "xml": case "svg":   return { mode: "xml", label: ext.toUpperCase() };
      case "md":                 return { mode: "markdown", label: "Markdown" };
      case "yml": case "yaml":  return { mode: "yaml", label: "YAML" };
      default:                   return { mode: null, label: "Plain Text" };
    }
  }

  function openFullscreenEditor(fileObj){
    if (typeof CodeMirror === "undefined"){
      alert("Editor kode gagal dimuat (CodeMirror tidak tersedia). Cek koneksi internet lalu refresh halaman.");
      return;
    }
    const lang = getLangForFile(fileObj.name);
    editorFileName.textContent = fileObj.name;
    editorLangBadge.textContent = lang.label;
    editorCmHost.innerHTML = "";
    editorOverlay.classList.remove("hidden");

    cmInstance = CodeMirror(editorCmHost, {
      value: fileObj.content ?? "",
      mode: lang.mode,
      theme: "material-darker",
      lineNumbers: true,
      lineWrapping: true,
      tabSize: 2,
      indentUnit: 2,
      autoCloseBrackets: true,
      matchBrackets: true,
    });
    setTimeout(() => cmInstance.refresh(), 50);
    const initialValue = fileObj.content ?? "";

    function closeEditor(force){
      if (!force && cmInstance.getValue() !== initialValue){
        const ok = confirm("Ada perubahan yang belum disimpan. Tutup tanpa menyimpan?");
        if (!ok) return;
      }
      editorOverlay.classList.add("hidden");
      editorCmHost.innerHTML = "";
      cmInstance = null;
      document.removeEventListener("keydown", onEscKey);
      editorSaveBtn.removeEventListener("click", onSave);
      editorCancelBtn.removeEventListener("click", onCancel);
    }
    function onSave(){
      fileObj.content = cmInstance.getValue();
      fileObj.size = new Blob([fileObj.content]).size;
      fileObj.edited = true;
      closeEditor(true);
      rerenderFileList();
    }
    function onCancel(){ closeEditor(false); }
    function onEscKey(e){ if (e.key === "Escape") closeEditor(false); }

    editorSaveBtn.addEventListener("click", onSave);
    editorCancelBtn.addEventListener("click", onCancel);
    document.addEventListener("keydown", onEscKey);
  }

  function resetUploadUI(){
    uploadResult.classList.add("hidden");
    uploadFileList.innerHTML = "";
    uploadFileName.textContent = "—";
    uploadUseBtn.classList.add("hidden");
    fileInput.value = "";
    uploadedProject = { sourceName: null, files: [] };
  }

  async function handleUploadedFile(file){
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();

    uploadFileList.innerHTML = "";
    uploadResult.classList.remove("hidden");
    uploadedProject = { sourceName: null, files: [] };
    if (projectNameInput) projectNameInput.value = "";

    if (ext === "zip"){
      uploadFileName.textContent = `📦 ${file.name} — diekstrak otomatis`;
      uploadedProject.sourceName = file.name.replace(/\.zip$/i, "");
      if (projectNameInput) projectNameInput.value = uploadedProject.sourceName;
      if (typeof JSZip === "undefined"){
        uploadFileList.appendChild(renderFileRow({ name: "Gagal memuat pustaka ekstraksi ZIP.", size: 0, editable: false, edited: false }, 0));
        return;
      }
      try {
        const zip = await JSZip.loadAsync(file);
        const entries = Object.values(zip.files).filter(f => !f.dir);
        if (entries.length === 0){
          uploadFileList.appendChild(renderFileRow({ name: "ZIP kosong / tidak ada file.", size: 0, editable: false, edited: false }, 0));
          return;
        }
        for (const entry of entries){
          const editable = isEditableExt(entry.name);
          let content = null;
          let size = 0;
          if (editable){
            content = await entry.async("string");
            size = new Blob([content]).size;
          } else {
            const bin = await entry.async("uint8array");
            size = bin.length;
          }
          uploadedProject.files.push({ name: entry.name, content, size, editable, edited: false });
        }
      } catch (err){
        uploadFileList.appendChild(renderFileRow({ name: "Gagal membaca ZIP: file mungkin rusak.", size: 0, editable: false, edited: false }, 0));
        return;
      }
      rerenderFileList();
    } else if (ext === "html" || ext === "htm"){
      uploadFileName.textContent = `📄 ${file.name}`;
      uploadedProject.sourceName = file.name.replace(/\.(html?|htm)$/i, "");
      if (projectNameInput) projectNameInput.value = uploadedProject.sourceName;
      const content = await readFileAsText(file);
      uploadedProject.files.push({ name: file.name, content, size: file.size, editable: true, edited: false });
      rerenderFileList();
    } else {
      uploadFileName.textContent = `⚠ ${file.name}`;
      uploadFileList.appendChild(renderFileRow({ name: "Format tidak didukung — gunakan .html atau .zip", size: 0, editable: false, edited: false }, 0));
    }
  }

  if (dropzone && fileInput){
    dropzone.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", () => {
      if (fileInput.files && fileInput.files[0]) handleUploadedFile(fileInput.files[0]);
    });

    ["dragenter", "dragover"].forEach(evt => {
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault(); e.stopPropagation();
        dropzone.classList.add("drag-over");
      });
    });
    ["dragleave", "drop"].forEach(evt => {
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault(); e.stopPropagation();
        dropzone.classList.remove("drag-over");
      });
    });
    dropzone.addEventListener("drop", (e) => {
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handleUploadedFile(file);
    });
  }

  if (uploadClearBtn){
    uploadClearBtn.addEventListener("click", resetUploadUI);
  }

  if (uploadUseBtn){
    uploadUseBtn.addEventListener("click", () => {
      if (uploadedProject.files.length === 0) return;
      let projectName = (projectNameInput && projectNameInput.value.trim()) || uploadedProject.sourceName || "uploaded-project";
      projectName = projectName.replace(/\s+/g, "-");
      const name = `${githubUser}/${projectName}`;
      const meta = `${uploadedProject.files.length} file · upload lokal`;
      addUploadedRepoCard(name, meta);
    });
  }

})();
