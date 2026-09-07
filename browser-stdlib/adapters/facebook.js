(() => {
  const navigation = window.__cogentiaNavigationAssistant;
  if (!navigation) throw new Error("Cogentia navigation stdlib is required before the Facebook adapter");

  function compact(text, limit = 1200) {
    return String(text || "").replace(/\s+/g, " ").trim().slice(0, limit);
  }

  function classify(ariaLabel, text) {
    const label = `${ariaLabel || ""} ${text || ""}`.toLocaleLowerCase("fr");
    if (/^réponse de\b|\bréponse au commentaire\b/.test(label)) return "reply";
    if (/^commentaire de\b/.test(label)) return "comment";
    if (/^publication de\b|^post by\b|\bpartagé avec\b/.test(label)) return "post";
    return "unknown";
  }

  function permalink(article) {
    return [...article.querySelectorAll("a[href]")]
      .map((anchor) => anchor.href)
      .find((href) => /permalink\.php|story_fbid|\/posts\//.test(href)) || null;
  }

  function visibleItems(limit = 20) {
    const articles = [...document.querySelectorAll('[role="article"]')];
    return articles.slice(0, limit).map((article, index) => {
      const ariaLabel = article.getAttribute("aria-label");
      const text = compact(article.innerText);
      return {
        index,
        kind: classify(ariaLabel, text),
        ariaLabel,
        text,
        permalink: permalink(article),
        signature: navigation.elementSignature(article),
      };
    }).filter((item) => item.text);
  }

  function commentSort() {
    const control = [...document.querySelectorAll('[role="button"], button')]
      .find((node) => /^(Plus pertinents|Tous les commentaires)$/i.test((node.innerText || "").trim()));
    return {
      found: Boolean(control),
      label: control ? (control.innerText || "").trim() : null,
      expanded: control?.getAttribute("aria-expanded") === "true",
      // Facebook does not expose a stable machine-readable sort identifier in
      // this view; the displayed label is therefore an observed UI state, not
      // an inference made by the assistant.
      source: control ? "visible-label" : null,
    };
  }

  function comments(limit = 50) {
    const seen = new Set();
    return visibleItems(limit * 2)
      .filter((item) => item.kind === "comment" || item.kind === "reply")
      .filter((item) => {
        // Facebook appends view-specific tracking parameters to the same
        // comment permalink.  Keep only stable comment identifiers before
        // deduplicating the DOM's repeated renderings of one contribution.
        const url = item.permalink ? new URL(item.permalink) : null;
        const key = url
          ? [url.searchParams.get("comment_id"), url.searchParams.get("reply_comment_id")].filter(Boolean).join(":")
          : `${item.ariaLabel}|${item.text}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, limit)
      .map((item, index) => ({
        ...item,
        index,
        observedOrder: index,
        author: item.ariaLabel?.match(/^(?:Commentaire|Réponse) de (.+?)(?: au commentaire| il y a)/i)?.[1] || null,
      }));
  }

  function commentComposer() {
    const candidates = [...document.querySelectorAll('[role="textbox"][contenteditable="true"]')]
      .filter((node) => /^(Commenter en tant que|Comment as )/i.test(node.getAttribute("aria-label") || ""));
    const active = document.activeElement;
    const activeCandidate = candidates.find((node) => node === active);
    return {
      found: candidates.length > 0,
      count: candidates.length,
      active: Boolean(activeCandidate),
      activeSignature: activeCandidate ? navigation.elementSignature(activeCandidate) : null,
      candidates: candidates.slice(0, 5).map((node) => navigation.elementSignature(node)),
    };
  }

  function writeCommentParagraphs(text) {
    const paragraphs = String(text)
      .split(/\r?\n\s*\r?\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
    const results = [];
    for (const [index, paragraph] of paragraphs.entries()) {
      if (index > 0) {
        // Three paragraph breaks leave two deliberately empty visual lines in
        // Facebook's contenteditable composer; raw LF text alone is often
        // normalized into one dense block by its React editor.
        results.push({ kind: "paragraph-break", ok: document.execCommand("insertParagraph", false, null) });
        results.push({ kind: "paragraph-break", ok: document.execCommand("insertParagraph", false, null) });
        results.push({ kind: "paragraph-break", ok: document.execCommand("insertParagraph", false, null) });
      }
      results.push({ kind: "text", ...navigation.insertText(paragraph) });
    }
    return {
      ok: results.every((result) => result.ok),
      paragraphs: paragraphs.length,
      results,
    };
  }

  function insertComment(text) {
    const composer = commentComposer();
    if (!composer.active) return { ok: false, error: "the active field is not a Facebook top-level comment composer", composer };
    return { ...writeCommentParagraphs(text), composer };
  }

  function replaceComment(text, { expectedStart = null, expectedEnd = null } = {}) {
    const composer = commentComposer();
    if (!composer.active) return { ok: false, error: "the active field is not a Facebook top-level comment composer", composer };
    const active = document.activeElement;
    const before = (active.innerText || "").trim();
    if (expectedStart && !before.startsWith(expectedStart)) return { ok: false, error: "the comment content no longer has the expected start", composer };
    if (expectedEnd && !before.endsWith(expectedEnd)) return { ok: false, error: "the comment content no longer has the expected end", composer };
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(active);
    selection.removeAllRanges();
    selection.addRange(range);
    const result = writeCommentParagraphs(text);
    return { ...result, beforeLength: before.length, composer };
  }

  async function discussion({ commentLimit = 50, expandPost = false } = {}) {
    return {
      sort: commentSort(),
      post: await currentPost({ expand: expandPost }),
      comments: comments(commentLimit),
      composer: commentComposer(),
    };
  }

  function postRoot() {
    const heading = [...document.querySelectorAll("h2")].find((node) => /^Publication de\s+/i.test(node.innerText?.trim() || ""));
    if (!heading) return null;
    let node = heading;
    // Facebook's permalink presentation places the post and its comments in a
    // larger wrapper. This is the smallest observed ancestor that contains the
    // post header and its first text block, before comment-heavy descendants.
    for (let depth = 0; node && depth < 6; depth += 1, node = node.parentElement) {
      if ((node.innerText || "").length > 700) return node;
    }
    return heading.parentElement;
  }

  function postTextNode(root) {
    return [...root.querySelectorAll('div[dir="auto"]')]
      .filter((node) => (node.innerText || "").trim().length > 40)
      .find((node) => !/^(Répondre|Commenter en tant que)/i.test((node.innerText || "").trim())) || null;
  }

  async function currentPost({ expand = false } = {}) {
    const root = postRoot();
    if (!root) return { found: false, reason: "publication heading not found" };
    let textNode = postTextNode(root);
    const before = compact(textNode?.innerText, 20_000);
    const more = [...root.querySelectorAll('[role="button"], a, div')]
      .find((node) => /^(En voir plus|Voir plus)$/i.test((node.innerText || "").trim()));
    let expanded = false;
    if (expand && more) {
      more.click();
      await new Promise((resolve) => setTimeout(resolve, 150));
      textNode = postTextNode(root);
      expanded = compact(textNode?.innerText, 20_000).length > before.length;
    }
    const text = compact(textNode?.innerText, 20_000);
    const heading = [...root.querySelectorAll("h2")].find((node) => /^Publication de\s+/i.test(node.innerText?.trim() || ""));
    return {
      found: Boolean(text),
      authorLabel: heading?.innerText?.trim() || null,
      text,
      textLength: text.length,
      truncated: Boolean(more) && !expanded,
      expanded,
    };
  }

  Object.defineProperty(navigation.adapters, "facebook", {
    value: Object.freeze({
      version: "0.2.1",
      visibleItems,
      currentPost,
      commentSort,
      comments,
      commentComposer,
      insertComment,
      replaceComment,
      discussion,
    }),
    configurable: true,
    enumerable: false,
  });
})();
