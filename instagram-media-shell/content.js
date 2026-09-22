(() => {
  if (window.top !== window || document.getElementById("ig-shell-host")) return;

  const VERSION = "2.8.1";
  const APP_ID = "936619743392459";
  const STORAGE_KEY = "ig_shell_selected_media_v2";
  const DOWNLOAD_HISTORY_PREFIX = "ig_shell_downloaded_v1_";
  const LOG_STORAGE_PREFIX = "ig_shell_logs_v1_";
  const MAX_LOG_ENTRIES = 500;
  const DIRECTORY_DB_NAME = "instagram_media_shell";
  const DIRECTORY_STORE_NAME = "directory_handles";
  const LAST_DIRECTORY_KEY = "last_download_directory";
  const PROFILE_BLOCKS = new Set(["accounts", "direct", "explore", "reel", "reels", "p", "stories"]);
  const host = document.createElement("div");
  host.id = "ig-shell-host";
  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });

  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      *, *::before, *::after { box-sizing: border-box; }
      .root {
        --green:#34ff79; --green2:#12b84f; --bg:#020805; --panel:#06110b;
        --line:rgba(52,255,121,.25); --muted:#75a884; --danger:#ff6464;
        position:fixed; right:18px; bottom:18px; z-index:2147483647;
        color:var(--green); font:13px/1.45 Consolas,"Cascadia Mono","Courier New",monospace;
      }
      button,input { font:inherit; }
      .launcher { border:1px solid var(--green); border-radius:7px; padding:11px 15px; color:var(--green);
        background:#031008; box-shadow:0 0 18px rgba(52,255,121,.22); cursor:pointer; font-weight:700; }
      .launcher:hover { background:#092014; box-shadow:0 0 25px rgba(52,255,121,.36); }
      .window { display:none; width:min(720px,calc(100vw - 24px)); height:min(760px,calc(100vh - 24px));
        border:1px solid var(--green2); border-radius:8px; overflow:hidden; background:rgba(2,8,5,.985);
        box-shadow:0 22px 80px #000,0 0 25px rgba(52,255,121,.2); }
      .window.open { display:flex; flex-direction:column; }
      .launcher.hidden { display:none; }
      .launcher.inline-mounted { display:none; }
      .bar { display:flex; align-items:center; gap:10px; padding:9px 12px; color:#baffce; background:#092014;
        border-bottom:1px solid var(--line); user-select:none; }
      .lights { display:flex; gap:6px; } .light { width:10px;height:10px;border-radius:50%;background:var(--green2); }
      .bar-title { flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .x { width:28px;height:26px;border:0;color:var(--green);background:transparent;cursor:pointer;font-size:20px; }
      .x:hover { background:rgba(52,255,121,.12); }
      .prompt { padding:12px 14px 9px;border-bottom:1px solid var(--line); }
      .prompt-line { color:#d5ffe1; } .prompt-line b { color:var(--green); }
      .folder-line { margin-top:8px;color:var(--muted);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
      .actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
      .cmd { border:1px solid var(--green2);border-radius:4px;padding:7px 10px;color:var(--green);background:#06150c;cursor:pointer; }
      .cmd:hover:not(:disabled) { background:#0b2615; } .cmd:disabled { opacity:.42;cursor:not-allowed; }
      .output { flex:1;overflow:auto;padding:10px 12px;scrollbar-color:var(--green2) #031008; }
      .line { margin:2px 0;color:var(--muted);white-space:pre-wrap;word-break:break-word; }
      .line.ok { color:var(--green); } .line.error { color:var(--danger); }
      .logs { margin:10px 0;border:1px solid var(--line);border-radius:5px;background:#020b06; }
      .logs-head { padding:7px 9px;color:#d5ffe1;border-bottom:1px solid var(--line);font-weight:700; }
      .log-entry { padding:4px 9px;color:var(--muted);font-size:11px;white-space:pre-wrap;word-break:break-word;border-bottom:1px dotted rgba(52,255,121,.12); }
      .log-entry:last-child { border-bottom:0; } .log-entry.error { color:var(--danger); } .log-entry.success { color:var(--green); }
      .section { margin:13px 0 7px;color:#d5ffe1;border-bottom:1px dashed var(--line);padding-bottom:5px;font-weight:700; }
      .highlight { margin:7px 0;border:1px solid var(--line);border-radius:5px;background:rgba(12,38,22,.42); }
      .highlight-head { display:grid;grid-template-columns:40px 1fr auto;gap:9px;align-items:center;padding:8px; }
      .post-head { display:grid;grid-template-columns:58px 1fr auto;gap:9px;align-items:center;padding:8px; }
      .cover,.thumb { display:block;object-fit:cover;background:#001e0c;border:1px solid var(--line); }
      .cover { width:40px;height:40px;border-radius:50%; } .thumb { width:58px;height:58px;border-radius:3px; }
      .post-cover { width:58px;height:58px;border-radius:4px;object-fit:cover;background:#001e0c;border:1px solid var(--line); }
      .post-actions { display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end; }
      .name { color:#caffd8;font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
      .sub { color:var(--muted);font-size:11px;margin-top:2px; }
      .media-list { border-top:1px solid var(--line);padding:4px 8px 8px; }
      .media { display:grid;grid-template-columns:22px 58px 1fr auto;gap:8px;align-items:center;padding:6px 0;border-bottom:1px dotted rgba(52,255,121,.13); }
      .media:last-child { border-bottom:0; } .media input { accent-color:var(--green);width:15px;height:15px; }
      .media.single-post { margin:7px 0;padding:8px;border:1px solid var(--line);border-radius:5px;background:rgba(12,38,22,.42); }
      .media.downloaded { border-color:rgba(52,255,121,.62);background:rgba(15,64,33,.52); }
      .media-meta { min-width:0; } .media-title { color:#caffd8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
      .downloaded-badge { display:inline-block;margin-left:7px;padding:1px 5px;border:1px solid var(--green2);border-radius:3px;color:var(--green);font-size:9px;line-height:1.35;vertical-align:1px; }
      .preview { color:var(--green);text-decoration:none;font-size:11px;padding:4px; }
      .footer { display:flex;align-items:center;gap:10px;padding:10px 12px;border-top:1px solid var(--line);background:#041009; }
      .selection { flex:1;color:var(--muted); } .download { color:#001b09;background:var(--green);font-weight:800;border:0;border-radius:4px;padding:9px 13px;cursor:pointer; }
      .download:disabled { opacity:.4;cursor:not-allowed; }
      .blink::after { content:"_";animation:blink 1s steps(1) infinite; } @keyframes blink { 50% { opacity:0; } }
      @media(max-width:600px){.root{right:6px;bottom:6px}.highlight-head{grid-template-columns:36px 1fr}.highlight-head .cmd{grid-column:1/-1}.media{grid-template-columns:20px 48px 1fr}.thumb{width:48px;height:48px}.preview{display:none}}
    </style>
    <div class="root">
      <button class="launcher" type="button">&gt;_ IG SHELL</button>
      <section class="window" aria-label="Instagram Media Shell">
        <div class="bar"><span class="lights"><i class="light"></i><i class="light"></i><i class="light"></i></span><span class="bar-title">instagram-media-shell v${VERSION}</span><button class="x" type="button">×</button></div>
        <div class="prompt">
          <div class="prompt-line"><b>ig@chrome</b>:<span class="cwd">~/profile</span>$ <span class="command blink">scan</span></div>
          <div class="actions">
            <button class="cmd scan" type="button">SCAN PROFILE</button>
            <button class="cmd load-stories" type="button" disabled>LOAD STORIES</button>
            <button class="cmd load-all" type="button" disabled>LOAD ALL HIGHLIGHTS</button>
            <button class="cmd load-posts" type="button" disabled>LOAD POSTS + REELS</button>
            <button class="cmd select-all" type="button" disabled>SELECT ALL</button>
            <button class="cmd folder" type="button">DOWNLOAD FOLDER</button>
            <button class="cmd show-logs" type="button" disabled>SHOW LOGS</button>
            <button class="cmd copy-logs" type="button" disabled>COPY LOGS</button>
            <button class="cmd clear" type="button">CLEAR</button>
          </div>
          <div class="folder-line">download: nenhuma pasta selecionada</div>
        </div>
        <div class="output"></div>
        <div class="footer"><span class="selection">0 mídia(s) selecionada(s)</span><button class="download" type="button" disabled>DOWNLOAD SELECTED</button></div>
      </section>
    </div>`;

  const $ = (s) => shadow.querySelector(s);
  const output = $(".output");
  const launcher = $(".launcher");
  const panel = $(".window");
  const loadStoriesButton = $(".load-stories");
  const loadAllButton = $(".load-all");
  const loadAllPostsButton = $(".load-posts");
  const selectAllButton = $(".select-all");
  const downloadButton = $(".download");
  const showLogsButton = $(".show-logs");
  const copyLogsButton = $(".copy-logs");
  const selectionLabel = $(".selection");
  const folderLabel = $(".folder-line");
  const state = { username:"", userId:"", stories:null, highlights:[], posts:[], selected:new Map(), downloaded:new Set(), directoryHandle:null, logs:[], showLogs:false, busy:false };

  function usernameFromPage() {
    const first = location.pathname.split("/").filter(Boolean)[0] || "";
    return first && !PROFILE_BLOCKS.has(first.toLowerCase()) && /^[\w.]+$/.test(first) ? first : "";
  }

  async function waitForProfileReady(username, timeoutMs=4500) {
    const startedAt = Date.now();
    while (!profileNameElement(username) && Date.now() - startedAt < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  function csrfToken() {
    return document.cookie.split("; ").find((v) => v.startsWith("csrftoken="))?.split("=").slice(1).join("=") || "";
  }

  async function igFetch(path) {
    const response = await fetch(path, {
      credentials:"include",
      headers:{ "X-IG-App-ID":APP_ID, "X-CSRFToken":csrfToken(), "X-Requested-With":"XMLHttpRequest" }
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 180);
      throw new Error(`Instagram respondeu HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
    }
    const data = await response.json().catch(() => { throw new Error("o Instagram retornou uma resposta inválida"); });
    if (data?.status === "fail") throw new Error(data.message || "A consulta foi recusada pelo Instagram");
    return data;
  }

  function addLine(text, kind="") {
    const line = document.createElement("div"); line.className = `line ${kind}`.trim(); line.textContent = text; output.appendChild(line); output.scrollTop = output.scrollHeight; return line;
  }

  function sanitize(value, fallback="media") {
    const cleaned = String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9._-]+/g,"_").replace(/^[_\.]+|[_\.]+$/g,"").slice(0,70);
    return cleaned || fallback;
  }

  function logStorageKey(username=state.username) {
    return `${LOG_STORAGE_PREFIX}${sanitize(username, "perfil")}`;
  }

  function formatLogEntry(entry) {
    const detail = entry.details ? ` | ${entry.details}` : "";
    return `[${entry.timestamp}] [${String(entry.level || "INFO").toUpperCase()}] ${entry.action}${detail}`;
  }

  async function loadProfileLogs(username) {
    const key = logStorageKey(username);
    const saved = await chrome.storage.local.get(key).catch(() => ({}));
    return Array.isArray(saved[key]) ? saved[key].slice(-MAX_LOG_ENTRIES) : [];
  }

  function persistLogs(username=state.username, entries=state.logs) {
    if (!username) return;
    const key = logStorageKey(username);
    chrome.storage.local.set({[key]:entries.slice(-MAX_LOG_ENTRIES)}).catch(() => {});
  }

  function appendLogEntry(container, entry) {
    const line = document.createElement("div");
    line.className = `log-entry ${entry.level || "info"}`;
    line.textContent = formatLogEntry(entry);
    container.appendChild(line);
  }

  function updateLogButtons() {
    const enabled = Boolean(state.username);
    showLogsButton.disabled = !enabled;
    copyLogsButton.disabled = !enabled || state.logs.length === 0;
    showLogsButton.textContent = state.showLogs ? "HIDE LOGS" : `SHOW LOGS${state.logs.length ? ` (${state.logs.length})` : ""}`;
  }

  function recordLog(level, action, details="") {
    if (!state.username) return;
    const entry = {
      timestamp:new Date().toISOString(),
      level:String(level || "info").toLowerCase(),
      action:String(action || "evento"),
      details:typeof details === "string" ? details : JSON.stringify(details)
    };
    state.logs.push(entry);
    if (state.logs.length > MAX_LOG_ENTRIES) state.logs.splice(0, state.logs.length - MAX_LOG_ENTRIES);
    persistLogs(state.username, state.logs);
    updateLogButtons();
    const visibleLogList = output.querySelector(".logs-body");
    if (state.showLogs && visibleLogList) appendLogEntry(visibleLogList, entry);
  }

  function logsAsText() {
    return [
      `Instagram Media Shell v${VERSION}`,
      `Perfil: @${state.username}`,
      `Logs: ${state.logs.length}`,
      "",
      ...state.logs.map(formatLogEntry)
    ].join("\n");
  }

  async function writeClipboard(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const field = document.createElement("textarea");
    field.value = text;
    field.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    shadow.appendChild(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    if (!copied) throw new Error("o navegador recusou o acesso ao clipboard");
  }

  async function copyLogs() {
    if (!state.username || !state.logs.length) return;
    recordLog("info", "COPY_LOGS_START", `${state.logs.length} registro(s) preparados para cópia`);
    try {
      await writeClipboard(logsAsText());
      recordLog("success", "COPY_LOGS_SUCCESS", "histórico copiado para o clipboard");
      addLine(`logs de @${state.username} copiados para o clipboard`, "ok");
    } catch (error) {
      recordLog("error", "COPY_LOGS_FAILURE", error.message);
      addLine(`não foi possível copiar os logs: ${error.message}`, "error");
    }
  }

  function downloadHistoryStorageKey(username=state.username) {
    return `${DOWNLOAD_HISTORY_PREFIX}${sanitize(username, "perfil")}`;
  }

  async function loadDownloadHistory(username) {
    const key = downloadHistoryStorageKey(username);
    const saved = await chrome.storage.local.get(key).catch(() => ({}));
    return new Set(Array.isArray(saved[key]) ? saved[key] : []);
  }

  async function persistDownloadHistory() {
    const key = downloadHistoryStorageKey();
    await chrome.storage.local.set({[key]:[...state.downloaded]}).catch(() => {});
  }

  function updateFolderLabel() {
    const profileFolder = state.username ? sanitize(state.username, "perfil") : "";
    folderLabel.textContent = state.directoryHandle
      ? `download: ${state.directoryHandle.name}${profileFolder ? `\\${profileFolder}` : ""}`
      : "download: nenhuma pasta selecionada";
    folderLabel.title = state.directoryHandle
      ? "As mídias serão gravadas dentro da subpasta com o nome do perfil"
      : "Clique em DOWNLOAD FOLDER para escolher uma pasta no computador";
  }

  function openDirectoryDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DIRECTORY_DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(DIRECTORY_STORE_NAME)) {
          request.result.createObjectStore(DIRECTORY_STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("não foi possível abrir o armazenamento de pastas"));
    });
  }

  async function readLastDirectoryHandle() {
    const database = await openDirectoryDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(DIRECTORY_STORE_NAME, "readonly");
      const request = transaction.objectStore(DIRECTORY_STORE_NAME).get(LAST_DIRECTORY_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("não foi possível restaurar a última pasta"));
      transaction.oncomplete = () => database.close();
      transaction.onabort = transaction.onerror = () => { database.close(); reject(transaction.error || new Error("falha ao ler a última pasta")); };
    });
  }

  async function rememberDirectoryHandle(directory) {
    const database = await openDirectoryDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(DIRECTORY_STORE_NAME, "readwrite");
      transaction.objectStore(DIRECTORY_STORE_NAME).put(directory, LAST_DIRECTORY_KEY);
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onabort = transaction.onerror = () => { database.close(); reject(transaction.error || new Error("falha ao salvar a pasta")); };
    });
  }

  async function loadDownloadFolder() {
    if (!state.directoryHandle) {
      state.directoryHandle = await readLastDirectoryHandle().catch(() => null);
    }
    updateFolderLabel();
    if (state.directoryHandle) recordLog("info", "DOWNLOAD_FOLDER_RESTORED", `pasta=${state.directoryHandle.name}`);
  }

  async function chooseDownloadFolder() {
    if (typeof window.showDirectoryPicker !== "function") {
      recordLog("error", "DOWNLOAD_FOLDER_UNAVAILABLE", "showDirectoryPicker não está disponível");
      addLine("seletor de pasta indisponível: atualize o Google Chrome e tente novamente", "error");
      return;
    }
    try {
      const directory = await window.showDirectoryPicker({
        id:"instagram-media-shell",
        mode:"readwrite",
        startIn:"downloads"
      });
      state.directoryHandle = directory;
      await rememberDirectoryHandle(directory).catch(() => {});
      updateFolderLabel();
      recordLog("success", "DOWNLOAD_FOLDER_SELECTED", `pasta=${directory.name}`);
      addLine(`pasta definida: ${directory.name}`, "ok");
    } catch (error) {
      if (error?.name === "AbortError") {
        recordLog("info", "DOWNLOAD_FOLDER_CANCELLED", "seleção cancelada pelo usuário");
      } else {
        recordLog("error", "DOWNLOAD_FOLDER_FAILURE", error.message);
        addLine(`não foi possível selecionar a pasta: ${error.message}`, "error");
      }
    }
  }

  function imageCandidate(item) {
    return item?.image_versions2?.candidates?.[0]?.url || item?.display_url || item?.thumbnail_src || item?.cover_media?.cropped_image_version?.url || item?.cover_media?.media?.image_versions2?.candidates?.[0]?.url || "";
  }

  function cleanHighlightTitle(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .replace(/^(destaque dos stories|story highlight)[,:\s-]*/i, "")
      .trim()
      .slice(0, 80);
  }

  function highlightTitleFromAnchor(anchor, index) {
    const candidates = [];
    const pushLines = (value) => String(value || "")
      .split(/\n+/)
      .map(cleanHighlightTitle)
      .filter((value) => value && value.length <= 80)
      .forEach((value) => candidates.push(value));

    pushLines(anchor.innerText);
    pushLines(anchor.getAttribute("aria-label"));
    for (const element of anchor.querySelectorAll("[aria-label], span[dir='auto']")) {
      pushLines(element.getAttribute("aria-label"));
      pushLines(element.textContent);
    }

    let parent = anchor.parentElement;
    for (let level = 0; parent && level < 3; level += 1, parent = parent.parentElement) {
      const text = String(parent.innerText || "").trim();
      if (text && text.length <= 120) pushLines(text);
    }

    const ignored = /^(ver|abrir|reproduzir|stories?|destaques?|highlight|open|play)$/i;
    return candidates.find((value) => !ignored.test(value)) || `Destaque ${index + 1}`;
  }

  function highlightsFromPage() {
    const unique = new Map();
    const anchors = document.querySelectorAll('a[href*="/stories/highlights/"]');

    for (const anchor of anchors) {
      if (!anchor.getClientRects().length) continue;
      const href = anchor.href || anchor.getAttribute("href") || "";
      const match = href.match(/\/stories\/highlights\/([^/?#]+)/i);
      if (!match) continue;

      const id = decodeURIComponent(match[1]);
      if (!/^\d+$/.test(id) || unique.has(id)) continue;
      const image = anchor.querySelector("img");
      unique.set(id, {
        id,
        title: highlightTitleFromAnchor(anchor, unique.size),
        cover: image?.currentSrc || image?.src || "",
        href: new URL(anchor.getAttribute("href") || href, location.origin).href,
        media: null,
        loading: false
      });
    }

    return [...unique.values()];
  }

  async function waitForHighlights(timeoutMs = 6500) {
    const startedAt = Date.now();
    let highlights = highlightsFromPage();
    while (!highlights.length && Date.now() - startedAt < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      highlights = highlightsFromPage();
    }
    return highlights;
  }

  function profileCoverFromPage() {
    const header = document.querySelector("main header") || document.querySelector("header");
    if (!header) return "";
    const images = [...header.querySelectorAll("img")]
      .filter((image) => {
        const rect = image.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .sort((a, b) => {
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();
        return (bRect.width * bRect.height) - (aRect.width * aRect.height);
      });
    return images[0]?.currentSrc || images[0]?.src || "";
  }

  function storyEntryFromPage(username) {
    const wanted = username.toLowerCase();
    const anchor = [...document.querySelectorAll('a[href*="/stories/"]')].find((candidate) => {
      if (!candidate.getClientRects().length) return false;
      const href = candidate.href || candidate.getAttribute("href") || "";
      const match = href.match(/\/stories\/([^/?#]+)(?:\/|$)/i);
      return match && decodeURIComponent(match[1]).toLowerCase() === wanted;
    });
    const image = anchor?.querySelector("img");
    return {
      id:`stories-${wanted}`,
      title:`Stories de @${username}`,
      cover:image?.currentSrc || image?.src || profileCoverFromPage(),
      href:anchor?.href || `${location.origin}/stories/${encodeURIComponent(username)}/`,
      detected:Boolean(anchor),
      media:null,
      loading:false
    };
  }

  async function waitForStoryEntry(username, timeoutMs=2500) {
    const startedAt = Date.now();
    let story = storyEntryFromPage(username);
    while (!story.detected && Date.now() - startedAt < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      story = storyEntryFromPage(username);
    }
    return story;
  }

  function profileUserIdFromPage(username) {
    const header = document.querySelector("main header") || document.querySelector("header");
    for (const element of header?.querySelectorAll("[data-user-id]") || []) {
      const value = element.getAttribute("data-user-id") || "";
      if (/^\d{5,}$/.test(value)) return value;
    }

    const token = `"username":"${String(username).replace(/[\\"\n\r]/g, "")}"`;
    for (const script of document.querySelectorAll('script[type="application/json"]')) {
      const text = script.textContent || "";
      let position = text.indexOf(token);
      while (position >= 0) {
        const before = text.slice(Math.max(0, position - 1800), position);
        const after = text.slice(position + token.length, position + token.length + 700);
        const preceding = [...before.matchAll(/"(?:pk|id|user_id)"\s*:\s*"?(\d{5,})"?/g)].at(-1)?.[1];
        const following = after.match(/"(?:pk|id|user_id)"\s*:\s*"?(\d{5,})"?/)?.[1];
        if (preceding || following) return preceding || following;
        position = text.indexOf(token, position + token.length);
      }
    }
    return "";
  }

  async function profileUserIdFromApi() {
    const response = await igFetch(`/api/v1/users/web_profile_info/?username=${encodeURIComponent(state.username)}`);
    const user = response?.data?.user || response?.user;
    const userId = String(user?.id || user?.pk || "");
    if (!/^\d+$/.test(userId)) throw new Error("não foi possível identificar o perfil para consultar os stories");
    return userId;
  }

  async function resolveProfileUserId() {
    if (state.userId) return state.userId;
    state.userId = profileUserIdFromPage(state.username) || await profileUserIdFromApi();
    return state.userId;
  }

  async function fetchStoriesReel(userId) {
    const response = await igFetch(`/api/v1/feed/reels_media/?reel_ids=${encodeURIComponent(userId)}`);
    const reels = response?.reels || {};
    return reels[userId] || reels[`user:${userId}`] || Object.values(reels)[0] || response?.reels_media?.[0] || null;
  }

  function postsFromPage() {
    const unique = new Map();
    const anchors = document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]');

    for (const anchor of anchors) {
      if (!anchor.getClientRects().length) continue;
      const href = anchor.href || anchor.getAttribute("href") || "";
      const match = href.match(/\/(p|reel)\/([^/?#]+)/i);
      if (!match) continue;

      const kind = match[1].toLowerCase();
      const shortcode = decodeURIComponent(match[2]);
      if (!/^[A-Za-z0-9_-]+$/.test(shortcode) || unique.has(shortcode)) continue;

      const image = anchor.querySelector("img");
      const alt = String(image?.alt || "").replace(/\s+/g, " ").trim();
      const markerText = [...anchor.querySelectorAll("[aria-label], svg title")]
        .map((element) => `${element.getAttribute?.("aria-label") || ""} ${element.textContent || ""}`)
        .join(" ");
      const isCarousel = /carrossel|carousel/i.test(markerText);
      unique.set(shortcode, {
        id: `post-${shortcode}`,
        shortcode,
        kind,
        title: alt ? alt.slice(0, 100) : `${kind === "reel" ? "Reel" : "Post"} ${unique.size + 1}`,
        cover: image?.currentSrc || image?.src || "",
        href: new URL(anchor.getAttribute("href") || href, location.origin).href,
        isCarousel,
        media: null,
        lastError: "",
        loading: false
      });
    }

    return [...unique.values()];
  }

  async function waitForPosts(timeoutMs = 6500) {
    const startedAt = Date.now();
    let posts = postsFromPage();
    while (!posts.length && Date.now() - startedAt < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      posts = postsFromPage();
    }
    return posts;
  }

  function shortcodeToMediaId(shortcode) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let value = 0n;
    const canonicalShortcode = String(shortcode || "").slice(0, 11);
    if (!canonicalShortcode) throw new Error("shortcode vazio");
    for (const character of canonicalShortcode) {
      const digit = alphabet.indexOf(character);
      if (digit < 0) throw new Error("shortcode inválido");
      value = value * 64n + BigInt(digit);
    }
    return value.toString();
  }

  function normalizeStoryItem(item, highlightTitle, index) {
    const video = item?.video_versions?.[0]?.url || item?.video_url || "";
    const image = imageCandidate(item);
    const url = video || image;
    if (!url) return null;
    const taken = item?.taken_at ? new Date(item.taken_at * 1000) : new Date();
    const id = String(item?.pk || item?.id || `${highlightTitle}-${index}-${url.slice(-30)}`);
    return { id:`story-${id}`, historyKey:`story:${id}`, url, thumb:image || url, type:video ? "video" : "imagem", title:`${highlightTitle} / mídia ${index + 1}`, folder:`Destaques/${sanitize(highlightTitle)}`, date:taken };
  }

  function normalizePostItem(item, post, index, total) {
    const video = item?.video_versions?.[0]?.url || item?.video_url || "";
    const image = imageCandidate(item);
    const url = video || image;
    if (!url) return null;
    const timestamp = item?.taken_at || item?.taken_at_timestamp;
    const taken = timestamp ? new Date(timestamp * 1000) : new Date();
    const id = String(item?.pk || item?.id || `${post.shortcode}-${index}`);
    const groupedTitle = total > 1 ? `${post.shortcode} / carrossel ${index + 1} de ${total}` : `${post.shortcode} / mídia única`;
    return {
      id:`post-${id}`,
      historyKey:`post:${post.shortcode}:${index + 1}`,
      url,
      thumb:image || post.cover || url,
      type:video ? "video" : "imagem",
      title:groupedTitle,
      folder:`Publicacoes/${sanitize(post.shortcode)}`,
      date:taken
    };
  }

  function normalizeHighlights(profileData, trayData) {
    const profileEdges = profileData?.edge_highlight_reels?.edges?.map((e) => e.node) || [];
    const tray = trayData?.tray || trayData?.data?.tray || profileEdges;
    return tray.map((item, index) => ({
      id:String(item.id || item.pk || item.reel_id || ""),
      title:item.title || `Destaque ${index + 1}`,
      cover:imageCandidate(item),
      media:null,
      loading:false
    })).filter((item) => item.id);
  }

  function mediaKey(media) { return `${media.id}|${media.url}`; }
  function mediaHistoryKey(media) { return media.historyKey || `media:${media.id}`; }
  function postHistoryKey(post, index=0) { return `post:${post.shortcode}:${index + 1}`; }
  function isDownloaded(media) { return state.downloaded.has(mediaHistoryKey(media)); }

  function filenameFor(media) {
    let ext = media.type === "video" ? "mp4" : "jpg";
    try { const match = new URL(media.url).pathname.match(/\.([a-zA-Z0-9]{2,5})$/); if (match) ext = match[1].toLowerCase(); } catch (_) {}
    const stamp = media.date.toISOString().replace(/[:T]/g,"-").replace(/\.\d{3}Z$/,"Z");
    return `${stamp}_${sanitize(media.title)}_${sanitize(media.id)}.${ext}`;
  }

  async function uniqueFileHandle(directory, requestedName) {
    const dot = requestedName.lastIndexOf(".");
    const base = dot > 0 ? requestedName.slice(0, dot) : requestedName;
    const extension = dot > 0 ? requestedName.slice(dot) : "";
    for (let copy = 0; copy < 1000; copy += 1) {
      const name = copy ? `${base} (${copy + 1})${extension}` : requestedName;
      try {
        await directory.getFileHandle(name);
      } catch (error) {
        if (error?.name === "NotFoundError") return directory.getFileHandle(name, {create:true});
        throw error;
      }
    }
    throw new Error("não foi possível gerar um nome de arquivo disponível");
  }

  async function saveMediaToDirectory(directory, media) {
    let credentials = "omit";
    try { if (new URL(media.url).origin === location.origin) credentials = "include"; } catch (_) {}
    const response = await fetch(media.url, {credentials});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const fileHandle = await uniqueFileHandle(directory, filenameFor(media));
    const writable = await fileHandle.createWritable();
    try {
      if (response.body) await response.body.pipeTo(writable);
      else {
        await writable.write(await response.blob());
        await writable.close();
      }
    } catch (error) {
      await writable.abort().catch(() => {});
      throw error;
    }
  }

  async function ensureProfileDownloadDirectory(rootDirectory, username=state.username) {
    const folderName = sanitize(username, "perfil");
    try {
      const directory = await rootDirectory.getDirectoryHandle(folderName);
      return {directory, folderName, created:false};
    } catch (error) {
      if (error?.name !== "NotFoundError") throw error;
      const directory = await rootDirectory.getDirectoryHandle(folderName, {create:true});
      return {directory, folderName, created:true};
    }
  }

  function updateSelection() {
    selectionLabel.textContent = `${state.selected.size} mídia(s) selecionada(s)`;
    downloadButton.disabled = state.selected.size === 0 || state.busy;
    selectAllButton.disabled = allLoadedMedia().length === 0;
  }

  function allLoadedMedia() { return [...(state.stories?.media || []), ...state.highlights.flatMap((h) => h.media || []), ...state.posts.flatMap((post) => post.media || [])]; }

  function mediaRow(media, labels={}) {
    const row = document.createElement("div"); row.className = "media";
    if (isDownloaded(media)) row.classList.add("downloaded");
    const check = document.createElement("input"); check.type = "checkbox"; check.checked = state.selected.has(mediaKey(media));
    check.addEventListener("change", () => { if (check.checked) state.selected.set(mediaKey(media), media); else state.selected.delete(mediaKey(media)); persistSelection(); updateSelection(); });
    const thumb = document.createElement("img"); thumb.className = "thumb"; thumb.src = media.thumb; thumb.alt = ""; thumb.loading = "lazy";
    const meta = document.createElement("div"); meta.className = "media-meta";
    const title = document.createElement("div"); title.className = "media-title"; title.textContent = labels.title || media.title;
    if (isDownloaded(media)) {
      const badge = document.createElement("span"); badge.className = "downloaded-badge"; badge.textContent = "BAIXADA"; title.appendChild(badge);
    }
    const sub = document.createElement("div"); sub.className = "sub"; sub.textContent = labels.sub || `${media.type} • ${media.date.toLocaleString("pt-BR")}`; meta.append(title,sub);
    const preview = document.createElement("a"); preview.className = "preview"; preview.href = media.url; preview.target = "_blank"; preview.rel = "noopener noreferrer"; preview.textContent = "OPEN";
    row.append(check,thumb,meta,preview); return row;
  }

  function singlePostPreviewRow(post, postIndex) {
    const row = document.createElement("div"); row.className = "media single-post";
    row.dataset.resultKey = `post:${post.shortcode}`;
    const alreadyDownloaded = state.downloaded.has(postHistoryKey(post));
    if (alreadyDownloaded) row.classList.add("downloaded");
    const check = document.createElement("input"); check.type = "checkbox"; check.disabled = post.loading;
    check.setAttribute("aria-label", `Selecionar mídia do post ${post.shortcode}`);
    check.addEventListener("change", async () => {
      if (!check.checked) {
        for (const media of post.media || []) state.selected.delete(mediaKey(media));
        await persistSelection(); updateSelection(); return;
      }

      const focusKey = `post:${post.shortcode}`;
      post.loading = true; renderResults(focusKey);
      try {
        await fetchPostMedia(post);
        if (post.media?.length) state.selected.set(mediaKey(post.media[0]), post.media[0]);
        await persistSelection();
      } catch (error) {
        post.lastError = error.message;
        recordLog("error", "POST_SELECT_FAILURE", `post=${post.shortcode} erro=${error.message}`);
        addLine(`erro no post ${post.shortcode}: ${error.message}`, "error");
      } finally {
        post.loading = false; renderResults(focusKey);
      }
    });

    const thumb = document.createElement("img"); thumb.className = "thumb"; thumb.src = post.cover; thumb.alt = ""; thumb.loading = "lazy";
    const meta = document.createElement("div"); meta.className = "media-meta";
    const title = document.createElement("div"); title.className = "media-title"; title.textContent = `${post.kind === "reel" ? "REEL" : "POST"} ${postIndex + 1} • ${post.shortcode}`;
    if (alreadyDownloaded) {
      const badge = document.createElement("span"); badge.className = "downloaded-badge"; badge.textContent = "BAIXADA"; title.appendChild(badge);
    }
    const sub = document.createElement("div"); sub.className = "sub"; sub.textContent = post.loading ? "obtendo arquivo original..." : `mídia única${alreadyDownloaded ? " • já baixada" : ""} • marque para selecionar`; meta.append(title,sub);
    const preview = document.createElement("a"); preview.className = "preview"; preview.href = post.href; preview.target = "_blank"; preview.rel = "noopener noreferrer"; preview.textContent = "OPEN";
    row.append(check,thumb,meta,preview); return row;
  }

  function renderPublicationSection(sectionName, publications, emptyMessage) {
    const section = document.createElement("div"); section.className = "section"; section.textContent = `[ ${sectionName}: ${publications.length} ]`; output.appendChild(section);
    if (!publications.length) { addLine(emptyMessage); return; }

    for (const [postIndex, post] of publications.entries()) {
      if (!post.isCarousel) {
        if (post.media?.length) {
          const media = post.media[0];
          const row = mediaRow(media, {
            title:`${post.kind === "reel" ? "REEL" : "POST"} ${postIndex + 1} • ${post.shortcode}`,
            sub:`${media.type} • mídia única • ${media.date.toLocaleString("pt-BR")}`
          });
          row.classList.add("single-post");
          row.dataset.resultKey = `post:${post.shortcode}`;
          output.appendChild(row);
        } else {
          output.appendChild(singlePostPreviewRow(post, postIndex));
        }
        continue;
      }

      const box = document.createElement("div"); box.className = "highlight";
      box.dataset.resultKey = `post:${post.shortcode}`;
      const head = document.createElement("div"); head.className = "post-head";
      const cover = document.createElement("img"); cover.className = "post-cover"; cover.src = post.cover; cover.alt = "";
      const meta = document.createElement("div"); const name = document.createElement("div"); name.className = "name"; name.textContent = `${post.kind === "reel" ? "REEL" : "POST"} ${postIndex + 1} • ${post.shortcode}`;
      const sub = document.createElement("div"); sub.className = "sub";
      sub.textContent = post.loading
        ? "CARROSSEL • consultando mídias..."
        : post.media?.length
          ? `${post.media.length} mídia(s) • CARROSSEL`
          : post.lastError ? "CARROSSEL • falha ao carregar; consulte os logs" : "CARROSSEL • clique em LIST MEDIA";
      meta.append(name,sub);

      const actions = document.createElement("div"); actions.className = "post-actions";
      const load = document.createElement("button"); load.className = "cmd"; load.type = "button"; load.textContent = post.loading ? "LOADING..." : post.media ? "RELOAD" : "LIST MEDIA"; load.disabled = post.loading;
      load.addEventListener("click", () => loadPost(post)); actions.appendChild(load);
      if (post.media?.length) {
        const groupSelect = document.createElement("button"); groupSelect.className = "cmd"; groupSelect.type = "button";
        const allSelected = post.media.every((media) => state.selected.has(mediaKey(media)));
        groupSelect.textContent = allSelected ? "CLEAR GROUP" : "SELECT GROUP";
        groupSelect.addEventListener("click", async () => {
          for (const media of post.media) {
            if (allSelected) state.selected.delete(mediaKey(media)); else state.selected.set(mediaKey(media), media);
          }
          await persistSelection(); renderResults();
        });
        actions.appendChild(groupSelect);
      }

      head.append(cover,meta,actions); box.appendChild(head);
      if (post.media) {
        const list = document.createElement("div"); list.className = "media-list";
        if (!post.media.length) { const empty=document.createElement("div");empty.className="line error";empty.textContent=post.lastError ? `erro: ${post.lastError}` : "não foi possível obter as mídias desta publicação";list.appendChild(empty); }
        else post.media.forEach((media) => list.appendChild(mediaRow(media)));
        box.appendChild(list);
      }
      output.appendChild(box);
    }
  }

  let renderVersion = 0;
  let scanVersion = 0;

  function renderLogsPanel() {
    const box = document.createElement("section");
    box.className = "logs";
    box.dataset.resultKey = `logs:${state.username}`;
    const head = document.createElement("div");
    head.className = "logs-head";
    const visible = state.logs.slice(-200);
    head.textContent = `[ LOGS DE @${state.username}: ${state.logs.length} ]${state.logs.length > visible.length ? " • exibindo os 200 mais recentes" : ""}`;
    const body = document.createElement("div");
    body.className = "logs-body";
    if (!visible.length) {
      const empty = document.createElement("div");
      empty.className = "log-entry";
      empty.textContent = "nenhum evento registrado para este perfil";
      body.appendChild(empty);
    } else visible.forEach((entry) => appendLogEntry(body, entry));
    box.append(head, body);
    output.appendChild(box);
  }

  function renderResults(focusKey="") {
    const version = ++renderVersion;
    const previousScrollTop = output.scrollTop;
    output.replaceChildren();
    addLine(`perfil: @${state.username}`, "ok");
    addLine("origem: elementos visíveis na página (sem consulta de perfil)");
    addLine(`destaques encontrados: ${state.highlights.length}`);

    const sTitle = document.createElement("div"); sTitle.className = "section"; sTitle.textContent = "[ STORIES DO PERFIL ]"; output.appendChild(sTitle);
    if (!state.stories) {
      addLine("consulta de stories ainda não disponível");
    } else {
      const box = document.createElement("div"); box.className = "highlight"; box.dataset.resultKey = `stories:${state.username}`;
      const head = document.createElement("div"); head.className = "highlight-head";
      const cover = document.createElement("img"); cover.className = "cover"; cover.src = state.stories.cover; cover.alt = "";
      const meta = document.createElement("div");
      const name = document.createElement("div"); name.className = "name"; name.textContent = state.stories.title;
      const sub = document.createElement("div"); sub.className = "sub";
      sub.textContent = state.stories.media
        ? `${state.stories.media.length} story(s) disponível(is)`
        : state.stories.detected ? "story ativo detectado • clique em LIST STORIES" : "clique em LIST STORIES para consultar";
      meta.append(name, sub);
      const button = document.createElement("button"); button.className = "cmd"; button.type = "button";
      button.textContent = state.stories.loading ? "LOADING..." : state.stories.media ? "RELOAD" : "LIST STORIES";
      button.disabled = state.stories.loading;
      button.addEventListener("click", () => loadStories());
      head.append(cover, meta, button); box.appendChild(head);
      if (state.stories.media) {
        const list = document.createElement("div"); list.className = "media-list";
        if (!state.stories.media.length) {
          const empty = document.createElement("div"); empty.className = "line"; empty.textContent = "nenhum story ativo foi retornado"; list.appendChild(empty);
        } else state.stories.media.forEach((media) => list.appendChild(mediaRow(media)));
        box.appendChild(list);
      }
      output.appendChild(box);
    }

    const hTitle = document.createElement("div"); hTitle.className = "section"; hTitle.textContent = "[ HIGHLIGHTS ]"; output.appendChild(hTitle);
    if (!state.highlights.length) addLine("nenhum destaque disponível para esta sessão");
    for (const highlight of state.highlights) {
      const box = document.createElement("div"); box.className = "highlight";
      box.dataset.resultKey = `highlight:${highlight.id}`;
      const head = document.createElement("div"); head.className = "highlight-head";
      const cover = document.createElement("img"); cover.className = "cover"; cover.src = highlight.cover; cover.alt = "";
      const meta = document.createElement("div"); const name = document.createElement("div"); name.className = "name"; name.textContent = highlight.title;
      const sub = document.createElement("div"); sub.className = "sub"; sub.textContent = highlight.media ? `${highlight.media.length} mídia(s)` : "mídias ainda não carregadas"; meta.append(name,sub);
      const button = document.createElement("button"); button.className = "cmd"; button.type = "button"; button.textContent = highlight.loading ? "LOADING..." : highlight.media ? "RELOAD" : "LIST MEDIA"; button.disabled = highlight.loading;
      button.addEventListener("click", () => loadHighlight(highlight)); head.append(cover,meta,button); box.appendChild(head);
      if (highlight.media) { const list = document.createElement("div"); list.className = "media-list"; if (!highlight.media.length) { const empty=document.createElement("div");empty.className="line";empty.textContent="sem mídias retornadas";list.appendChild(empty); } else highlight.media.forEach((m) => list.appendChild(mediaRow(m))); box.appendChild(list); }
      output.appendChild(box);
    }

    const posts = state.posts.filter((post) => post.kind !== "reel");
    const reels = state.posts.filter((post) => post.kind === "reel");
    renderPublicationSection("POSTS", posts, "nenhum post carregado foi encontrado na página");
    renderPublicationSection("REELS", reels, "nenhum reel carregado foi encontrado na página");
    if (state.showLogs) renderLogsPanel();
    loadStoriesButton.disabled = !state.stories || state.stories.loading || state.busy;
    loadAllButton.disabled = state.highlights.length === 0 || state.busy;
    loadAllPostsButton.disabled = state.posts.length === 0 || state.busy;
    updateLogButtons();
    updateSelection();
    requestAnimationFrame(() => {
      if (version !== renderVersion) return;
      if (!focusKey) {
        output.scrollTop = previousScrollTop;
        return;
      }
      const target = [...output.querySelectorAll("[data-result-key]")]
        .find((element) => element.dataset.resultKey === focusKey);
      if (!target) { output.scrollTop = previousScrollTop; return; }
      const top = target.getBoundingClientRect().top - output.getBoundingClientRect().top + output.scrollTop;
      output.scrollTop = Math.max(0, top - 8);
    });
  }

  async function scanProfile() {
    const username = usernameFromPage();
    if (!username) { output.replaceChildren(); addLine("erro: abra a página principal de um perfil, por exemplo instagram.com/nome/", "error"); return; }
    if (state.busy && username.toLowerCase() === state.username.toLowerCase()) return;

    const version = ++scanVersion;
    output.replaceChildren();
    state.busy = true; state.username = username; state.userId=""; state.stories=null; state.highlights=[]; state.posts=[]; state.selected.clear(); state.downloaded.clear(); state.logs=[]; state.showLogs=false;
    $(".cwd").textContent=`~/${username}`;
    updateSelection();
    updateLogButtons();
    addLine(`$ scan --profile @${username}`, "ok"); addLine("aguardando o perfil atual e lendo stories, destaques, posts e reels...");
    try {
      const logs = await loadProfileLogs(username);
      if (version !== scanVersion || usernameFromPage().toLowerCase() !== username.toLowerCase()) return;
      state.logs = logs;
      recordLog("info", "SCAN_PROFILE_START", `perfil=@${username}`);
      await waitForProfileReady(username);
      const [downloaded, stories, highlights, posts] = await Promise.all([
        loadDownloadHistory(username),
        waitForStoryEntry(username),
        waitForHighlights(),
        waitForPosts()
      ]);
      await loadDownloadFolder();
      if (version !== scanVersion || usernameFromPage().toLowerCase() !== username.toLowerCase()) return;
      state.downloaded=downloaded; state.stories=stories; state.highlights=highlights; state.posts=posts;
      recordLog("success", "SCAN_PROFILE_SUCCESS", `stories=${stories ? 1 : 0} destaques=${highlights.length} posts_e_reels=${posts.length}`);
      renderResults();
      if (!state.highlights.length) {
        recordLog("info", "SCAN_HIGHLIGHTS_EMPTY", "nenhum destaque encontrado na página");
        addLine("nenhum destaque foi encontrado na página. O perfil pode não ter destaques ou eles ainda não estão visíveis.");
      }
      if (!state.posts.length) {
        recordLog("info", "SCAN_PUBLICATIONS_EMPTY", "nenhum post ou reel encontrado na página");
        addLine("nenhum post ou reel foi encontrado. Role a grade do perfil, execute SCAN PROFILE novamente e tente outra vez.");
      }
    } catch (error) {
      if (version === scanVersion) {
        recordLog("error", "SCAN_PROFILE_FAILURE", error.message);
        addLine(`erro ao ler a página: ${error.message}`, "error"); addLine("atualize a página do perfil e tente novamente.");
      }
    } finally {
      if (version !== scanVersion) return;
      state.busy=false;
      loadStoriesButton.disabled=!state.stories;
      loadAllButton.disabled=state.highlights.length===0;
      loadAllPostsButton.disabled=state.posts.length===0;
      updateSelection();
    }
  }

  async function loadStories(quiet=false) {
    if (!state.stories || state.stories.loading) return;
    const focusKey = quiet ? "" : `stories:${state.username}`;
    recordLog("info", "LOAD_STORIES_START", `perfil=@${state.username}`);
    state.stories.loading=true; renderResults(focusKey);
    try {
      let userId = await resolveProfileUserId();
      let reel = await fetchStoriesReel(userId);
      const reelUsername = String(reel?.user?.username || reel?.owner?.username || "").toLowerCase();
      if ((state.stories.detected && !reel) || (reelUsername && reelUsername !== state.username.toLowerCase())) {
        userId = await profileUserIdFromApi();
        state.userId = userId;
        reel = await fetchStoriesReel(userId);
      }
      const items = Array.isArray(reel?.items) ? reel.items : [];
      state.stories.media = items
        .map((item, index) => normalizeStoryItem(item, `Story @${state.username}`, index))
        .filter(Boolean);
      state.stories.detected = state.stories.media.length > 0;
      recordLog("success", "LOAD_STORIES_SUCCESS", `midias=${state.stories.media.length}`);
      if (!quiet) addLine(`ok: stories de @${state.username} -> ${state.stories.media.length} mídia(s)`, "ok");
    } catch (error) {
      state.stories.media=[];
      recordLog("error", "LOAD_STORIES_FAILURE", error.message);
      if (!quiet) addLine(`erro nos stories de @${state.username}: ${error.message}`, "error");
    } finally { state.stories.loading=false; renderResults(focusKey); }
  }

  async function loadHighlight(highlight, quiet=false) {
    if (highlight.loading) return;
    const focusKey = quiet ? "" : `highlight:${highlight.id}`;
    recordLog("info", "LOAD_HIGHLIGHT_START", `id=${highlight.id} titulo=${highlight.title}`);
    highlight.loading=true; renderResults(focusKey);
    try {
      const reelId = highlight.id.startsWith("highlight:") ? highlight.id : `highlight:${highlight.id}`;
      const response = await igFetch(`/api/v1/feed/reels_media/?reel_ids=${encodeURIComponent(reelId)}`);
      const reel = response?.reels?.[reelId] || response?.reels?.[highlight.id] || Object.values(response?.reels || {})[0];
      highlight.media = (reel?.items || []).map((item,index) => normalizeStoryItem(item,highlight.title,index)).filter(Boolean);
      recordLog("success", "LOAD_HIGHLIGHT_SUCCESS", `id=${highlight.id} midias=${highlight.media.length}`);
      if (!quiet) addLine(`ok: ${highlight.title} -> ${highlight.media.length} mídia(s)`, "ok");
    } catch (error) {
      highlight.media=[];
      recordLog("error", "LOAD_HIGHLIGHT_FAILURE", `id=${highlight.id} erro=${error.message}`);
      if (!quiet) addLine(`erro em ${highlight.title}: ${error.message}`, "error");
    } finally { highlight.loading=false; renderResults(focusKey); }
  }

  async function loadAllHighlights() {
    if (state.busy) return;
    recordLog("info", "LOAD_ALL_HIGHLIGHTS_START", `quantidade=${state.highlights.length}`);
    state.busy=true; loadAllButton.disabled=true; addLine("$ load --all-highlights", "ok");
    for (const highlight of state.highlights) {
      if (!highlight.media) await loadHighlight(highlight,true);
      await new Promise((resolve) => setTimeout(resolve,250));
    }
    state.busy=false;
    recordLog("success", "LOAD_ALL_HIGHLIGHTS_FINISH", `quantidade=${state.highlights.length}`);
    renderResults(); addLine("todos os destaques disponíveis foram processados", "ok");
  }

  function mediaRootFromPayload(payload, canonicalShortcode, acceptDirect=false) {
    const direct = payload?.items?.[0] || payload?.item || payload?.media_or_ad || payload?.data?.items?.[0] || payload?.data?.item;
    if (acceptDirect && direct && typeof direct === "object") return direct;

    const queue = [{value:payload, depth:0}];
    const visited = new Set();
    let inspected = 0;
    while (queue.length && inspected < 20000) {
      const {value, depth} = queue.shift();
      if (!value || typeof value !== "object" || visited.has(value)) continue;
      visited.add(value);
      inspected += 1;

      const code = String(value.code || value.shortcode || "");
      const hasMedia = Boolean(
        imageCandidate(value) || value.video_url || value.video_versions?.length ||
        value.carousel_media?.length || value.edge_sidecar_to_children?.edges?.length
      );
      if (code.slice(0, 11) === canonicalShortcode && hasMedia) return value;
      if (depth >= 14) continue;
      for (const child of Array.isArray(value) ? value : Object.values(value)) {
        if (child && typeof child === "object") queue.push({value:child, depth:depth + 1});
      }
    }
    return null;
  }

  async function fetchPostRootFromPage(post, canonicalShortcode) {
    const response = await fetch(post.href, {
      credentials:"include",
      cache:"no-store",
      headers:{Accept:"text/html,application/xhtml+xml"}
    });
    if (!response.ok) throw new Error(`página do post respondeu HTTP ${response.status}`);
    const html = await response.text();
    const documentCopy = new DOMParser().parseFromString(html, "text/html");
    for (const script of documentCopy.querySelectorAll('script[type="application/json"]')) {
      const source = script.textContent?.trim();
      if (!source || !source.includes(canonicalShortcode)) continue;
      try {
        const root = mediaRootFromPayload(JSON.parse(source), canonicalShortcode, false);
        if (root) return root;
      } catch (_) {}
    }
    throw new Error("dados incorporados da publicação não foram encontrados");
  }

  async function fetchPostMedia(post) {
    const canonicalShortcode = post.shortcode.slice(0, 11);
    const mediaId = shortcodeToMediaId(canonicalShortcode);
    recordLog("info", "POST_MEDIA_REQUEST", `post=${post.shortcode} shortcode_base=${canonicalShortcode} media_pk=${mediaId}`);

    let root = null;
    let apiError = null;
    try {
      const response = await igFetch(`/api/v1/media/${encodeURIComponent(mediaId)}/info/`);
      root = mediaRootFromPayload(response, canonicalShortcode, true);
      if (!root) throw new Error("resposta sem objeto de mídia");
      recordLog("success", "POST_MEDIA_API_SUCCESS", `post=${post.shortcode}`);
    } catch (error) {
      apiError = error;
      recordLog("warning", "POST_MEDIA_API_FALLBACK", `post=${post.shortcode} erro=${error.message}`);
    }

    if (!root) {
      try {
        root = await fetchPostRootFromPage(post, canonicalShortcode);
        recordLog("success", "POST_MEDIA_PAGE_SUCCESS", `post=${post.shortcode}`);
      } catch (pageError) {
        const parts = [apiError?.message, pageError?.message].filter(Boolean).join("; fallback da página: ");
        throw new Error(parts || "o Instagram não retornou os dados do post");
      }
    }

    const sidecar = root?.edge_sidecar_to_children?.edges?.map((edge) => edge?.node).filter(Boolean) || [];
    const children = Array.isArray(root.carousel_media) && root.carousel_media.length
      ? root.carousel_media
      : sidecar.length ? sidecar : [root];
    post.isCarousel = children.length > 1;
    post.media = children.map((item,index) => normalizePostItem(item,post,index,children.length)).filter(Boolean);
    if (!post.media.length) throw new Error("nenhuma mídia utilizável foi retornada");
    post.lastError = "";
    return post.media;
  }

  async function loadPost(post, quiet=false) {
    if (post.loading) return;
    const focusKey = quiet ? "" : `post:${post.shortcode}`;
    recordLog("info", "LOAD_POST_START", `post=${post.shortcode} tipo=${post.kind}`);
    post.loading=true; renderResults(focusKey);
    try {
      await fetchPostMedia(post);
      recordLog("success", "LOAD_POST_SUCCESS", `post=${post.shortcode} midias=${post.media.length} carrossel=${post.isCarousel}`);
      if (!quiet) addLine(`ok: ${post.shortcode} -> ${post.media.length} mídia(s)`, "ok");
    } catch (error) {
      post.media=[];
      post.lastError=error.message;
      recordLog("error", "LOAD_POST_FAILURE", `post=${post.shortcode} erro=${error.message}`);
      if (!quiet) addLine(`erro no post ${post.shortcode}: ${error.message}`, "error");
    } finally { post.loading=false; renderResults(focusKey); }
  }

  async function loadAllPosts() {
    if (state.busy) return;
    recordLog("info", "LOAD_ALL_PUBLICATIONS_START", `quantidade=${state.posts.length}`);
    state.busy=true; loadAllPostsButton.disabled=true; addLine("$ load --posts-and-reels", "ok");
    for (const post of state.posts) {
      if (!post.media) await loadPost(post,true);
      await new Promise((resolve) => setTimeout(resolve,350));
    }
    state.busy=false;
    const failures = state.posts.filter((post) => post.lastError).length;
    recordLog(failures ? "warning" : "success", "LOAD_ALL_PUBLICATIONS_FINISH", `quantidade=${state.posts.length} falhas=${failures}`);
    renderResults(); addLine("todos os posts e reels visíveis foram processados", "ok");
  }

  async function persistSelection() {
    const values = [...state.selected.values()].map((m) => ({...m,date:m.date.toISOString()}));
    await chrome.storage.local.set({[STORAGE_KEY]:values}).catch(() => {});
  }

  async function downloadSelected() {
    if (state.busy || !state.selected.size) return;
    if (!state.directoryHandle) {
      recordLog("error", "DOWNLOAD_BLOCKED", "nenhuma pasta selecionada");
      addLine("selecione primeiro uma pasta em DOWNLOAD FOLDER", "error");
      return;
    }

    try {
      const permission = await state.directoryHandle.queryPermission({mode:"readwrite"});
      if (permission !== "granted" && await state.directoryHandle.requestPermission({mode:"readwrite"}) !== "granted") {
        recordLog("error", "DOWNLOAD_PERMISSION_DENIED", `pasta=${state.directoryHandle.name}`);
        addLine("permissão de gravação na pasta não concedida", "error");
        return;
      }
    } catch (error) {
      recordLog("error", "DOWNLOAD_FOLDER_ACCESS_FAILURE", `pasta=${state.directoryHandle.name} erro=${error.message}`);
      addLine(`não foi possível acessar a pasta selecionada: ${error.message}`, "error");
      return;
    }

    let profileDirectoryInfo;
    try {
      profileDirectoryInfo = await ensureProfileDownloadDirectory(state.directoryHandle);
      const event = profileDirectoryInfo.created ? "PROFILE_FOLDER_CREATED" : "PROFILE_FOLDER_REUSED";
      const targetPath = `${state.directoryHandle.name}\\${profileDirectoryInfo.folderName}`;
      recordLog("success", event, `pasta=${targetPath}`);
    } catch (error) {
      recordLog("error", "PROFILE_FOLDER_FAILURE", `perfil=@${state.username} erro=${error.message}`);
      addLine(`não foi possível criar ou acessar a pasta do perfil: ${error.message}`, "error");
      return;
    }

    const items = [...state.selected.entries()];
    state.selected.clear();
    state.busy=true;
    await persistSelection();
    renderResults();
    const targetPath = `${state.directoryHandle.name}\\${profileDirectoryInfo.folderName}`;
    recordLog("info", "DOWNLOAD_START", `arquivos=${items.length} pasta=${targetPath}`);
    addLine(`$ download --selected ${items.length} --folder "${targetPath}"`, "ok");
    let completed = 0;
    const failures = [];
    try {
      for (const [, media] of items) {
        try {
          await saveMediaToDirectory(profileDirectoryInfo.directory, media);
          state.downloaded.add(mediaHistoryKey(media));
          completed += 1;
          recordLog("success", "DOWNLOAD_FILE_SUCCESS", `midia=${media.title} pasta=${targetPath}`);
        } catch (error) {
          failures.push(`${media.title}: ${error.message}`);
          recordLog("error", "DOWNLOAD_FILE_FAILURE", `midia=${media.title} erro=${error.message}`);
        }
      }
      await persistDownloadHistory();
    } finally {
      state.busy=false;
      recordLog(failures.length ? "warning" : "success", "DOWNLOAD_FINISH", `salvos=${completed} falhas=${failures.length} pasta=${targetPath}`);
      renderResults();
      addLine(`${completed} arquivo(s) salvo(s) em ${targetPath}; ${failures.length} falha(s).`, completed ? "ok" : "error");
      failures.forEach((failure) => addLine(`erro: ${failure}`, "error"));
    }
  }

  let profileLauncherHost = null;
  let profileLauncherTimer = 0;

  function profileNameElement(expectedUsername=usernameFromPage()) {
    const username = String(expectedUsername || "").toLowerCase();
    const header = document.querySelector("main header") || document.querySelector("header");
    if (!username || !header) return null;
    return [...header.querySelectorAll("h1, h2, span")].find((element) => {
      if (element.childElementCount) return false;
      const text = String(element.textContent || "").trim().replace(/^@/, "").toLowerCase();
      const rect = element.getBoundingClientRect();
      return text === username && rect.width > 0 && rect.height > 0;
    }) || null;
  }

  function profileHeaderRow(target) {
    const header = target.closest("header") || document.querySelector("main header") || document.querySelector("header");
    let element = target.parentElement;
    while (element && element !== header?.parentElement) {
      const style = getComputedStyle(element);
      const interactive = element.matches("button, a, [role='button']");
      const otherAction = [...element.querySelectorAll("button, [role='button']")]
        .some((candidate) => candidate !== target && !candidate.contains(target) && candidate.id !== "ig-shell-profile-launcher-host");
      if (!interactive && (style.display === "flex" || style.display === "inline-flex") && otherAction) return element;
      element = element.parentElement;
    }
    return header;
  }

  function mountProfileLauncher() {
    const target = profileNameElement();
    const row = target ? profileHeaderRow(target) : null;
    if (!target || !row) {
      if (profileLauncherHost?.isConnected) profileLauncherHost.remove();
      launcher.classList.remove("inline-mounted");
      return;
    }

    if (!profileLauncherHost) {
      profileLauncherHost = document.createElement("span");
      profileLauncherHost.id = "ig-shell-profile-launcher-host";
      profileLauncherHost.style.cssText = "display:inline-flex;align-items:center;flex:0 0 auto;margin-left:10px;vertical-align:middle;position:relative;z-index:3";
      const inlineShadow = profileLauncherHost.attachShadow({mode:"open"});
      inlineShadow.innerHTML = `
        <style>
          button { width:30px;height:30px;border:1px solid #12b84f;border-radius:7px;color:#34ff79;background:#031008;cursor:pointer;font:700 12px/1 Consolas,"Cascadia Mono",monospace;box-shadow:0 0 10px rgba(52,255,121,.22) }
          button:hover { background:#092014;box-shadow:0 0 16px rgba(52,255,121,.4) }
        </style>
        <button type="button" title="Abrir Instagram Media Shell" aria-label="Abrir Instagram Media Shell">&gt;_</button>`;
      const button = inlineShadow.querySelector("button");
      for (const eventName of ["pointerdown", "mousedown", "touchstart"]) {
        button.addEventListener(eventName, (event) => {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
        }, true);
      }
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        openPanel();
      }, true);
    }

    if (profileLauncherHost.parentElement !== row) row.appendChild(profileLauncherHost);
    launcher.classList.add("inline-mounted");
  }

  function scheduleProfileLauncher() {
    clearTimeout(profileLauncherTimer);
    profileLauncherTimer = setTimeout(mountProfileLauncher, 250);
  }

  function toggleLogs() {
    if (!state.username) return;
    state.showLogs = !state.showLogs;
    recordLog("info", state.showLogs ? "LOG_PANEL_OPEN" : "LOG_PANEL_CLOSE");
    renderResults(state.showLogs ? `logs:${state.username}` : "");
  }

  function openPanel() { panel.classList.add("open"); launcher.classList.add("hidden"); $(".cwd").textContent=`~/${usernameFromPage() || "profile"}`; scanProfile(); }
  function closePanel() { panel.classList.remove("open"); launcher.classList.remove("hidden"); }

  launcher.addEventListener("click",openPanel); $(".x").addEventListener("click",closePanel); $(".scan").addEventListener("click",scanProfile); loadStoriesButton.addEventListener("click",loadStories); loadAllButton.addEventListener("click",loadAllHighlights); loadAllPostsButton.addEventListener("click",loadAllPosts); $(".folder").addEventListener("click",chooseDownloadFolder); showLogsButton.addEventListener("click",toggleLogs); copyLogsButton.addEventListener("click",copyLogs); downloadButton.addEventListener("click",downloadSelected);
  $(".clear").addEventListener("click",async()=>{state.selected.clear();state.showLogs=false;recordLog("info","TERMINAL_CLEAR");await persistSelection();output.replaceChildren();addLine("terminal limpo; execute SCAN PROFILE", "ok");updateSelection();updateLogButtons();});
  selectAllButton.addEventListener("click",async()=>{const all=allLoadedMedia();const shouldSelect=all.some((m)=>!state.selected.has(mediaKey(m)));for(const m of all){if(shouldSelect)state.selected.set(mediaKey(m),m);else state.selected.delete(mediaKey(m));}recordLog("info",shouldSelect?"SELECT_ALL":"CLEAR_ALL_SELECTION",`midias=${all.length}`);await persistSelection();renderResults();});
  chrome.runtime.onMessage.addListener((message)=>{if(message?.type!=="IG_TOGGLE_PANEL")return;panel.classList.contains("open")?closePanel():openPanel();});
  new MutationObserver(scheduleProfileLauncher).observe(document.documentElement,{childList:true,subtree:true});
  mountProfileLauncher();
  updateLogButtons();
})();
