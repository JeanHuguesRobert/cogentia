#!/usr/bin/env node
/**
 * Facebook Dispatcher CLI (Hosted Browser CDP Native Engine).
 *
 * Connects to the hosted Chromium instance on Fracta2 via CDP to:
 * 1. Reload facebook.com and wait for React tree hydration.
 * 2. Click the composer trigger ("Quoi de neuf, Jean...").
 * 3. Clear any existing content and type the status text.
 * 4. Progress through wizard steps ("Suivant" / Next) and click "Publier" (Post).
 *
 * Usage:
 *   node scripts/fb-dispatch-cli.js --dry-run
 *   node scripts/fb-dispatch-cli.js --text="Custom text..."
 *   node scripts/fb-dispatch-cli.js
 */

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { 
  listActiveTabs, 
  detectActiveFacebookAccount, 
  sendCdpCommand, 
  DEFAULT_CDP_ENDPOINT 
} from "./ops/cdp-browser-extractor.js";

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const textArg = args.find(a => a.startsWith("--text="));
  const defaultTestText = `Test d'infrastructure de campagne et de souveraineté cognitive. Retrouvez l'ensemble de nos travaux, architectures et corpus ouverts : https://github.com/JeanHuguesRobert`;
  const postText = textArg ? textArg.split("=").slice(1).join("=") : defaultTestText;

  console.log("==========================================================================");
  console.log(" 📘 FACEBOOK DISPATCHER (Hosted Browser CDP Engine)");
  console.log(`    Mode : ${isDryRun ? "SIMULATION (DRY-RUN)" : "LIVE / REAL DISPATCH"}`);
  console.log("==========================================================================\n");

  console.log("🔍 Locating Facebook tab in Chromium...");
  const tabs = await listActiveTabs(DEFAULT_CDP_ENDPOINT);
  const fbTab = tabs.find(t => t.url.includes("facebook.com"));

  if (!fbTab) {
    console.error("❌ No active Facebook tab found in browser.");
    process.exit(1);
  }

  console.log(`✅ Facebook tab detected: [${fbTab.id}] ${fbTab.title}`);
  const fbInfo = await detectActiveFacebookAccount(DEFAULT_CDP_ENDPOINT);
  console.log(`   • User ID    : ${fbInfo.facebook_user_id || "Active"}`);
  console.log(`   • Current URL: ${fbInfo.url}\n`);

  console.log("📝 Post text content:");
  console.log(`--------------------------------------------------\n${postText}\n--------------------------------------------------\n`);

  const wsUrl = fbTab.webSocketDebuggerUrl;

  console.log("🔄 Ensuring clean feed state (dismissing stories/modals if active)...");
  try {
    await sendCdpCommand(wsUrl, "Runtime.evaluate", {
      expression: `(() => {
        const closeBtn = document.querySelector('div[aria-label="Fermer"][role="button"], div[aria-label="Close"][role="button"]');
        if (closeBtn) closeBtn.click();
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
        window.location.href = "https://www.facebook.com/";
      })()`
    });
  } catch (_) {}

  console.log("⏳ Actively waiting for React feed hydration...");
  const maxWaitMs = 45000;
  const startWait = Date.now();
  let buttonCount = 0;

  while (Date.now() - startWait < maxWaitMs) {
    await new Promise(r => setTimeout(r, 2000));
    try {
      const checkRes = await sendCdpCommand(wsUrl, "Runtime.evaluate", {
        expression: `(() => {
          const btns = document.querySelectorAll('div[role="button"], div[tabindex="0"]');
          return {
            readyState: document.readyState,
            buttonCount: btns.length,
            title: document.title,
            url: window.location.href
          };
        })()`,
        returnByValue: true
      });
      const val = checkRes.result?.value;
      if (val && val.buttonCount > 15 && !val.url.includes('/stories/')) {
        buttonCount = val.buttonCount;
        console.log(`   • React feed hydrated: ${val.buttonCount} interactive elements (title='${val.title}', url='${val.url}')`);
        break;
      } else {
        console.log(`   ... Waiting for feed hydration (elements=${val?.buttonCount || 0}, url='${val?.url || ""}'))...`);
      }
    } catch (_) {}
  }

  console.log("⏳ Final 2.5s stabilization wait...");
  await new Promise(r => setTimeout(r, 2500));

  console.log("📝 Step 1: Clicking 'Quoi de neuf, Jean...' composer pill...");
  const openRes = await sendCdpCommand(wsUrl, "Runtime.evaluate", {
    expression: `(() => {
      function triggerClick(el) {
        if (!el) return;
        el.focus();
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, view: window }));
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
        el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, view: window }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
        el.click();
      }

      // 1. Locate specific leaf element with "Quoi de neuf, Jean..."
      const candidates = Array.from(document.body.querySelectorAll('span, div[role="button"], div[tabindex="0"], div[role="main"] *'));
      const quoiDeNeuf = candidates.find(el => {
        const t = (el.innerText || el.textContent || '').trim().toLowerCase();
        return (t.includes("quoi de neuf") || 
                t.includes("what's on your mind") || 
                t.includes("à quoi pensez-vous") ||
                t.includes("que voulez-vous dire")) && 
               t.length < 100;
      });

      if (quoiDeNeuf) {
        const clickable = quoiDeNeuf.closest('div[role="button"], div[tabindex="0"]') || quoiDeNeuf;
        triggerClick(clickable);
        return { opened: true, method: "exact_leaf_quoi_de_neuf", text: quoiDeNeuf.innerText || quoiDeNeuf.textContent };
      }

      // 2. Fallback: explicit Create Post aria button
      const ariaBtn = candidates.find(el => {
        const a = (el.getAttribute('aria-label') || '').toLowerCase();
        return (a.includes("créer") && a.includes("publication")) || 
               (a.includes("create") && a.includes("post"));
      });
      if (ariaBtn) {
        triggerClick(ariaBtn);
        return { opened: true, method: "aria_label", label: ariaBtn.getAttribute('aria-label') };
      }

      return { opened: false };
    })()`,
    returnByValue: true
  });

  console.log("   • Composer open result:", openRes.result?.value || openRes);
  console.log("⏳ Waiting for modal textbox to mount, clearing existing text, and typing new post...");

  let typed = false;
  let editorText = "";

  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 800));
    try {
      const res = await sendCdpCommand(wsUrl, "Runtime.evaluate", {
        expression: `(() => {
          const editor = document.querySelector('div[role="dialog"] div[role="textbox"][contenteditable="true"]') ||
                         document.querySelector('form div[role="textbox"][contenteditable="true"]') ||
                         document.querySelector('div[role="textbox"][contenteditable="true"]');
          if (!editor) return { found: false, has_dialog: !!document.querySelector('div[role="dialog"]') };

          editor.focus();
          // Cleanly clear any pre-existing / duplicated text
          document.execCommand('selectAll', false, null);
          document.execCommand('delete', false, null);
          document.execCommand('insertText', false, ${JSON.stringify(postText)});
          editor.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: ${JSON.stringify(postText)}
          }));
          return { found: true, editor_text: editor.innerText || editor.textContent };
        })()`,
        returnByValue: true
      });

      const val = res.result?.value;
      if (val && val.found) {
        typed = true;
        editorText = val.editor_text;
        console.log(`   • Text successfully injected into editor (${editorText.length} chars)!`);
        break;
      }
    } catch (_) {}
  }

  if (!typed) {
    console.error("❌ Modal textbox not found after waiting.");
    process.exit(1);
  }

  if (isDryRun) {
    console.log("\n🎉 FACEBOOK SUCCESS (Dry-Run Mode): Text cleanly typed in dialog without clicking publish.");
    return;
  }

  console.log("📝 Step 3: Handling wizard progression ('Suivant' / Next) and final 'Publier' (Post)...");
  let published = false;

  for (let i = 0; i < 25; i++) {
    await new Promise(r => setTimeout(r, 800));
    try {
      const res = await sendCdpCommand(wsUrl, "Runtime.evaluate", {
        expression: `(() => {
          function triggerClick(el) {
            if (!el) return;
            el.focus();
            el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, view: window }));
            el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
            el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, view: window }));
            el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
            el.click();
          }

          const allBtns = Array.from(document.querySelectorAll('div[role="dialog"] div[role="button"], div[role="dialog"] div[aria-label]'));
          
          // 1. Check for "Suivant" / "Next" button first
          const nextBtn = allBtns.find(b => {
            const a = (b.getAttribute('aria-label') || '').toLowerCase();
            const t = (b.innerText || '').toLowerCase();
            return a.includes("suivant") || a.includes("next") || t === "suivant" || t === "next";
          });

          if (nextBtn && nextBtn.getAttribute('aria-disabled') !== 'true') {
            triggerClick(nextBtn);
            return { action: "clicked_next" };
          }

          // 2. Check for final "Publier" / "Post" button
          const postBtn = allBtns.find(b => {
            const a = (b.getAttribute('aria-label') || '').toLowerCase();
            const t = (b.innerText || '').toLowerCase();
            return a === "publier" || a === "post" || t === "publier" || t === "post";
          }) || document.querySelector('div[role="dialog"] div[aria-label="Publier"][role="button"]');

          if (postBtn) {
            if (postBtn.getAttribute('aria-disabled') === 'true') {
              return { action: "post_disabled" };
            }
            triggerClick(postBtn);
            return { action: "published", timestamp: new Date().toISOString() };
          }

          return { action: "waiting" };
        })()`,
        returnByValue: true
      });

      const val = res.result?.value;
      if (val && val.action === "clicked_next") {
        console.log("   • 'Suivant' clicked, advancing to final publication step...");
        await new Promise(r => setTimeout(r, 1200));
      } else if (val && val.action === "published") {
        console.log("\n🎉 POST SUCCESSFULLY PUBLISHED TO FACEBOOK!");
        console.log(`   • Timestamp  : ${val.timestamp}`);
        console.log(`   • Account ID : ${fbInfo.facebook_user_id || "692361265"}\n`);
        published = true;
        break;
      }
    } catch (_) {}
  }

  if (!published) {
    console.error("\n❌ Failed to complete publication.");
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Facebook critical error:", err.message);
  process.exit(1);
});
