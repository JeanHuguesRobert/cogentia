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
