const SAFE_ROOT = "Instagram";

function sanitizePart(value, fallback = "arquivo") {
  const cleaned = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .trim()
    .slice(0, 90);
  return cleaned || fallback;
}

function safeFilename(filename) {
  const parts = String(filename || "")
    .split("/")
    .filter(Boolean)
    .map((part) => sanitizePart(part));

  if (parts[0] !== SAFE_ROOT) {
    parts.unshift(SAFE_ROOT);
  }

  return parts.join("/").slice(0, 220);
}

function downloadOne(item) {
  return new Promise((resolve) => {
    if (!item || !/^https:\/\//i.test(item.url || "")) {
      resolve({
        id: item?.id,
        ok: false,
        error: "A midia nao possui uma URL HTTPS valida. Atualize o story e adicione-o novamente."
      });
      return;
    }

    chrome.downloads.download(
      {
        url: item.url,
        filename: safeFilename(item.filename),
        conflictAction: "uniquify",
        saveAs: false
      },
      (downloadId) => {
        const error = chrome.runtime.lastError;
        if (error || typeof downloadId !== "number") {
          resolve({
            id: item.id,
            ok: false,
            error: error?.message || "O Chrome nao iniciou o download."
          });
          return;
        }

        resolve({ id: item.id, ok: true, downloadId });
      }
    );
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "IG_DOWNLOAD_ITEMS") {
    return false;
  }

  (async () => {
    const items = Array.isArray(message.items) ? message.items.slice(0, 300) : [];
    const results = [];

    // Downloads sequenciais evitam que o Chrome bloqueie uma rajada de requisicoes.
    for (const item of items) {
      results.push(await downloadOne(item));
    }

    sendResponse({ ok: results.some((result) => result.ok), results });
  })().catch((error) => {
    sendResponse({ ok: false, error: error?.message || "Falha inesperada." });
  });

  return true;
});

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id || !/^https:\/\/(www\.)?instagram\.com\//i.test(tab.url || "")) {
    return;
  }

  chrome.tabs.sendMessage(tab.id, { type: "IG_TOGGLE_PANEL" }).catch(() => {});
});
