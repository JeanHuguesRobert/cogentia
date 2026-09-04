/**
 * CDP Hosted Browser Session Extractor & Remote Commander.
 *
 * Connects to a Chrome DevTools Protocol (CDP) endpoint (e.g. 127.0.0.1:9223 on Fracta2 / browser.fractavolta.com)
 * to:
 * 1. Extract live session cookies (auth_token, ct0, etc.) for X, Facebook, Instagram without manual copy-pasting.
 * 2. Execute remote JavaScript in page context (Runtime.evaluate).
 * 3. Inspect active tabs and navigate pages (Page.navigate).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const secretsDir = path.join(root, ".cogentia", "secrets");

export const DEFAULT_CDP_ENDPOINT = process.env.CDP_ENDPOINT || "http://127.0.0.1:9223";

export const X_ACCOUNT_METADATA = {
  suvranu: {
    handle: "@suvranu",
    email: "jean_hugues_robert@yahoo.com",
    role: "popular_sovereignty_relay"
  },
  baronsmariani: {
    handle: "@baronsmariani",
    role: "official_statements"
  },
  jhr: {
    handle: "@jhr",
    role: "historical_authority"
  }
};

/**
 * Sends a raw CDP JSON-RPC command over a WebSocket connection.
 */
export async function sendCdpCommand(wsUrl, method, params = {}) {
  return new Promise((resolve, reject) => {
    const ws = new globalThis.WebSocket(wsUrl);
    const id = Math.floor(Math.random() * 1000000);

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error(`CDP command timed out after 30000ms: ${method}`));
    }, 30000);

    ws.onopen = () => {
      ws.send(JSON.stringify({ id, method, params }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.id === id) {
          clearTimeout(timeout);
          ws.close();
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        }
      } catch (e) {
        // ignore non-json messages
      }
    };

    ws.onerror = (err) => {
      clearTimeout(timeout);
      reject(err);
    };
  });
}

/**
 * Gets the browser WebSocket URL from the CDP HTTP endpoint.
 */
export async function getBrowserWebSocketUrl(endpoint = DEFAULT_CDP_ENDPOINT) {
  const version = await fetch(`${endpoint}/json/version`).then(r => r.json());
  return version.webSocketDebuggerUrl;
}

/**
 * Lists all active tabs in the hosted browser.
 */
export async function listActiveTabs(endpoint = DEFAULT_CDP_ENDPOINT) {
  const tabs = await fetch(`${endpoint}/json/list`).then(r => r.json());
  return tabs.filter(t => t.type === "page");
}

/**
 * Extracts cookies for a target domain (e.g. x.com) using Network.getCookies over CDP.
 */
export async function extractCookiesForUrls(urls = ["https://x.com"], endpoint = DEFAULT_CDP_ENDPOINT) {
  const browserWs = await getBrowserWebSocketUrl(endpoint);
  const result = await sendCdpCommand(browserWs, "Storage.getCookies", {});
  const allCookies = result.cookies || [];

  const filtered = allCookies.filter(c => {
    return urls.some(u => {
      const hostname = new URL(u).hostname.replace(/^www\./, "");
      return c.domain.includes(hostname);
    });
  });

  return filtered;
}

/**
 * Automatically extracts and saves X/Twitter session tokens (auth_token and ct0) from the hosted browser.
 */
export async function extractAndSaveXSession(accountKey = "baronsmariani", endpoint = DEFAULT_CDP_ENDPOINT) {
  const cookies = await extractCookiesForUrls(["https://x.com", "https://twitter.com"], endpoint);

  const authTokenCookie = cookies.find(c => c.name === "auth_token");
  const ct0Cookie = cookies.find(c => c.name === "ct0");

  if (!authTokenCookie || !ct0Cookie) {
    return {
      success: false,
      error: "No active X.com session found in hosted browser cookies.",
      found_cookies_count: cookies.length
    };
  }

  const meta = X_ACCOUNT_METADATA[accountKey] || {};
  const sessionPayload = {
    account: accountKey,
    handle: meta.handle || `@${accountKey}`,
    email: meta.email || null,
    extracted_at: new Date().toISOString(),
    auth_method: "cdp_hosted_browser",
    auth_token: authTokenCookie.value,
    ct0: ct0Cookie.value,
    full_cookies: cookies.map(c => ({ name: c.name, value: c.value, domain: c.domain, path: c.path }))
  };

  if (!fs.existsSync(secretsDir)) fs.mkdirSync(secretsDir, { recursive: true });
  const secretFile = path.join(secretsDir, `x_session_${accountKey}.json`);
  fs.writeFileSync(secretFile, JSON.stringify(sessionPayload, null, 2), "utf8");

  return {
    success: true,
    account: accountKey,
    secret_file: secretFile,
    auth_token_preview: authTokenCookie.value.slice(0, 6) + "...",
    ct0_preview: ct0Cookie.value.slice(0, 6) + "..."
  };
}

/**
 * Evaluates arbitrary JavaScript inside an active tab.
 */
export async function evaluateJsInTab(tabId, expression, endpoint = DEFAULT_CDP_ENDPOINT) {
  const tabs = await listActiveTabs(endpoint);
  const targetTab = tabs.find(t => t.id === tabId) || tabs[0];
  if (!targetTab) throw new Error("No active page tab found in hosted browser.");

  return await sendCdpCommand(targetTab.webSocketDebuggerUrl, "Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
}

/**
 * Detects the currently logged-in X/Twitter account name and handle from DOM.
 */
export async function detectActiveXAccount(endpoint = DEFAULT_CDP_ENDPOINT) {
  const expr = `(() => {
    const btn = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
    const profileLink = document.querySelector('[data-testid="AppTabBar_Profile_Link"]');
    const userAvatar = document.querySelector('[data-testid="UserAvatar-Container-unknown"]');
    const allLinks = Array.from(document.querySelectorAll('a[role="link"]')).map(a => a.href);
    return {
      raw_text: btn ? btn.innerText : null,
      profile_href: profileLink ? profileLink.getAttribute('href') : null,
      document_title: document.title,
      url: window.location.href
    };
  })()`;

  const tabs = await listActiveTabs(endpoint);
  const xTabs = tabs.filter(t => t.url.includes("x.com") || t.url.includes("twitter.com"));
  if (xTabs.length === 0) return { error: "No X tab found" };

  const results = [];
  for (const xTab of xTabs) {
    try {
      const evalRes = await sendCdpCommand(xTab.webSocketDebuggerUrl, "Runtime.evaluate", {
        expression: expr,
        returnByValue: true,
        awaitPromise: true
      });
      results.push({
        tab_id: xTab.id,
        tab_title: xTab.title,
        ...(evalRes.result?.value || evalRes.result)
      });
    } catch (e) {
      results.push({ tab_id: xTab.id, error: e.message });
    }
  }

  return results.length === 1 ? results[0] : results;
}

/**
 * Automates account switching via DOM to discover, switch to, and extract
 * session cookies for ALL connected accounts in the X tab.
 */
export async function extractAllConnectedAccounts(endpoint = DEFAULT_CDP_ENDPOINT) {
  const tabs = await listActiveTabs(endpoint);
  const xTab = tabs.find(t => t.url.includes("x.com") || t.url.includes("twitter.com"));
  if (!xTab) throw new Error("No open X/Twitter tab found.");

  const wsUrl = xTab.webSocketDebuggerUrl;

  // Step 1: Open account switcher menu and list all available accounts
  const listAccountsExpr = `(async () => {
    let btn = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
    if (!btn) return { error: "No account switcher button found." };
    btn.click();
    await new Promise(r => setTimeout(r, 600));

    const menu = document.querySelector('[data-testid="AccountSwitcher_Menu"]') || document.querySelector('[role="menu"]');
    if (!menu) return { error: "Account switcher menu did not open." };

    const rows = Array.from(menu.querySelectorAll('[data-testid="AccountSwitcher_User_Row"], [role="menuitem"]'));
    const accounts = rows.map((r, i) => {
      const match = r.innerText.match(/@([a-zA-Z0-9_]+)/);
      return {
        index: i,
        handle: match ? match[1] : null,
        full_text: r.innerText
      };
    }).filter(a => a.handle);

    // Close menu for now
    document.body.click();
    return { success: true, accounts };
  })()`;

  const listRes = await sendCdpCommand(wsUrl, "Runtime.evaluate", {
    expression: listAccountsExpr,
    returnByValue: true,
    awaitPromise: true
  });

  const discovery = listRes.result?.value;
  if (!discovery || !discovery.success || !discovery.accounts || discovery.accounts.length === 0) {
    const single = await detectActiveXAccount(endpoint);
    const singleObj = Array.isArray(single) ? single[0] : single;
    const match = singleObj.raw_text?.match(/@([a-zA-Z0-9_]+)/);
    const handle = match ? match[1] : "default";
    const res = await extractAndSaveXSession(handle.toLowerCase(), endpoint);
    return [res];
  }

  const extractedAccounts = [];

  for (const acc of discovery.accounts) {
    const handleKey = acc.handle.toLowerCase();

    // Switch to account via DOM click
    const switchExpr = `(async () => {
      const btn = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
      if (btn) btn.click();
      await new Promise(r => setTimeout(r, 600));

      const menu = document.querySelector('[data-testid="AccountSwitcher_Menu"]') || document.querySelector('[role="menu"]');
      if (!menu) return { error: "Menu not found" };

      const rows = Array.from(menu.querySelectorAll('[data-testid="AccountSwitcher_User_Row"], [role="menuitem"]'));
      const targetRow = rows.find(r => r.innerText.includes("@" + ${JSON.stringify(acc.handle)}));
      if (targetRow) {
        targetRow.click();
        await new Promise(r => setTimeout(r, 1800));
        return { switched: true, target: ${JSON.stringify(acc.handle)} };
      }
      return { switched: false };
    })()`;

    await sendCdpCommand(wsUrl, "Runtime.evaluate", {
      expression: switchExpr,
      returnByValue: true,
      awaitPromise: true
    });

    // Wait for session cookie sync in Chrome
    await new Promise(r => setTimeout(r, 1800));

    // Extract cookies for this account
    const saveRes = await extractAndSaveXSession(handleKey, endpoint);
    extractedAccounts.push({
      handle: `@${acc.handle}`,
      ...saveRes
    });
  }

  return extractedAccounts;
}

/**
 * Programmatically switches the active account in the open X tab.
 */
export async function switchToAccountInTab(targetHandle, endpoint = DEFAULT_CDP_ENDPOINT) {
  const cleanHandle = targetHandle.replace(/^@/, "").toLowerCase();
  const tabs = await listActiveTabs(endpoint);
  const xTab = tabs.find(t => t.url.includes("x.com") || t.url.includes("twitter.com"));
  if (!xTab) throw new Error("Aucun onglet X ouvert trouvé.");

  const wsUrl = xTab.webSocketDebuggerUrl;

  const expr = `(async () => {
    function triggerClick(el) {
      el.focus();
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, view: window }));
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
      el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, view: window }));
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
      el.click();
    }

    const btn = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]') ||
                document.querySelector('button[aria-label*="Compte"], div[aria-label*="Compte"]');
    if (!btn) return { success: false, error: "Bouton de sélection de compte introuvable." };

    triggerClick(btn);
    await new Promise(r => setTimeout(r, 1200));

    // Chercher le menu dans l'ensemble du DOM (souvent monté en racine sous #layers)
    const menu = document.querySelector('[data-testid="AccountSwitcher_Menu"]') || 
                 document.querySelector('[data-testid="Dropdown"]') ||
                 document.querySelector('[role="menu"]') ||
                 document.querySelector('div[data-viewportview="true"]') ||
                 document.querySelector('#layers div[role="group"]');
    if (!menu) return { success: false, error: "Le menu de sélection de compte ne s'est pas ouvert." };

    const clickableElements = Array.from(menu.querySelectorAll('a, button, [role="menuitem"], [data-testid*="AccountSwitcher_User"], div[dir="ltr"]'));
    const targetEl = clickableElements.find(el => el.innerText.toLowerCase().includes("@" + ${JSON.stringify(cleanHandle)}));

    if (!targetEl) {
      const available = clickableElements.map(el => el.innerText).filter(t => t.includes("@"));
      document.body.click();
      return { 
        success: false, 
        error: "Compte non trouvé dans le sélecteur.",
        target: "@" + ${JSON.stringify(cleanHandle)},
        comptes_disponibles_dans_le_menu: Array.from(new Set(available))
      };
    }

    triggerClick(targetEl);
    await new Promise(r => setTimeout(r, 3000));

    const newBtn = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
    return {
      success: true,
      switched_to: "@" + ${JSON.stringify(cleanHandle)},
      nouveau_compte_actif: newBtn ? newBtn.innerText : "OK",
      timestamp: new Date().toISOString()
    };
  })()`;

  const evalRes = await sendCdpCommand(wsUrl, "Runtime.evaluate", {
    expression: expr,
    returnByValue: true,
    awaitPromise: true
  });

  return evalRes.result?.value || evalRes.result;
}

/**
 * Detects the currently logged-in Facebook account from DOM.
 */
export async function detectActiveFacebookAccount(endpoint = DEFAULT_CDP_ENDPOINT) {
  const tabs = await listActiveTabs(endpoint);
  const fbTab = tabs.find(t => t.url.includes("facebook.com"));
  if (!fbTab) return { error: "Aucun onglet Facebook ouvert trouvé dans Chromium." };

  const expr = `(() => {
    const cUser = (document.cookie.match(/c_user=([^;]+)/) || [])[1];
    const profileLink = document.querySelector('a[href*="/me"], a[href*="/profile.php"], a[aria-label*="profil" i], a[aria-label*="profile" i]');
    
    return {
      tab_title: document.title,
      url: window.location.href,
      facebook_user_id: cUser || null,
      profile_url: profileLink ? profileLink.href : null,
      profile_name: profileLink ? profileLink.innerText.trim() : document.title.replace(/\\s*\\([0-9]+\\+\\)\\s*/, '').replace(/\\s*\\| Facebook$/, '')
    };
  })()`;

  const evalRes = await sendCdpCommand(fbTab.webSocketDebuggerUrl, "Runtime.evaluate", {
    expression: expr,
    returnByValue: true
  });

  return {
    tab_id: fbTab.id,
    ...(evalRes.result?.value || evalRes.result)
  };
}

/**
 * Extracts and saves Facebook session tokens (c_user, xs, datr, fr) into .cogentia/secrets/fb_session_<alias>.json
 */
export async function extractAndSaveFacebookSession(alias = "default", endpoint = DEFAULT_CDP_ENDPOINT) {
  const cookies = await extractCookiesForUrls(["https://facebook.com"], endpoint);
  const cUser = cookies.find(c => c.name === "c_user");
  const xs = cookies.find(c => c.name === "xs");

  if (!cUser || !xs) {
    return {
      success: false,
      error: "Cookies de session Facebook (c_user / xs) introuvables. Vérifiez que vous êtes connecté sur Facebook."
    };
  }

  const secretsDir = path.resolve(process.cwd(), ".cogentia", "secrets");
  if (!fs.existsSync(secretsDir)) {
    fs.mkdirSync(secretsDir, { recursive: true });
  }

  const sessionPayload = {
    platform: "facebook",
    alias,
    c_user: cUser.value,
    xs: xs.value,
    extracted_at: new Date().toISOString(),
    auth_method: "cdp_hosted_browser",
    full_cookies: cookies.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      secure: c.secure,
      httpOnly: c.httpOnly
    }))
  };

  const secretPath = path.join(secretsDir, `fb_session_${alias}.json`);
  fs.writeFileSync(secretPath, JSON.stringify(sessionPayload, null, 2), "utf8");

  return {
    success: true,
    platform: "facebook",
    alias,
    c_user_preview: cUser.value,
    xs_preview: xs.value.slice(0, 10) + "...",
    secret_file: secretPath,
    extracted_at: sessionPayload.extracted_at
  };
}
