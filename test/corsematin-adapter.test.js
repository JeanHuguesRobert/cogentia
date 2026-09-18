import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";

const NAVIGATION_PATH = new URL("../browser-stdlib/navigation.js", import.meta.url);
const ADAPTER_PATH = new URL("../browser-stdlib/adapters/corsematin.js", import.meta.url);

class MockNode {
  constructor({ tag = "DIV", attrs = {}, text = "", children = [] } = {}) {
    this.tagName = tag.toUpperCase();
    this.attrs = { ...attrs };
    this.text = text;
    this.children = [];
    this.parentElement = null;
    for (const child of children) {
      this.appendChild(child);
    }
  }

  appendChild(child) {
    if (!(child instanceof MockNode)) return;
    child.parentElement = this;
    this.children.push(child);
  }

  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null;
  }

  setAttribute(name, value) {
    this.attrs[name] = String(value);
  }

  get id() {
    return this.attrs.id || "";
  }

  get className() {
    return this.attrs.class || "";
  }

  get href() {
    return this.attrs.href || "";
  }

  get innerText() {
    if (this.children.length === 0) return this.text;
    return this.children.map((c) => c.innerText).filter(Boolean).join(" ");
  }

  get textContent() {
    return this.innerText;
  }

  matches(selector) {
    const s = selector.trim();
    if (!s) return false;

    // Split multiple selectors by comma
    if (s.includes(",")) {
      return s.split(",").some((part) => this.matches(part));
    }

    // Class selector
    if (s.startsWith(".")) {
      const cls = s.slice(1);
      return (this.attrs.class || "").split(/\s+/).includes(cls);
    }

    // ID selector
    if (s.startsWith("#")) {
      return this.attrs.id === s.slice(1);
    }

    // Attribute selector [attr="val"] or [attr*="val"] or [attr]
    const attrMatch = s.match(/^\[([a-zA-Z0-9_-]+)(?:([*~|^$]?=)"?([^"\]]*)"?)?\]$/);
    if (attrMatch) {
      const [, attr, op, val] = attrMatch;
      const actual = this.getAttribute(attr);
      if (actual === null) return false;
      if (!op) return true;
      if (op === "=") return actual === val;
      if (op === "*=") return actual.includes(val);
      if (op === "^=") return actual.startsWith(val);
      if (op === "$=") return actual.endsWith(val);
      return false;
    }

    // Tag selector with attribute e.g. script[type="application/ld+json"]
    const tagAttrMatch = s.match(/^([a-zA-Z0-9]+)\[([a-zA-Z0-9_-]+)(?:([*~|^$]?=)"?([^"\]]*)"?)?\]$/);
    if (tagAttrMatch) {
      const [, tag, attr, op, val] = tagAttrMatch;
      if (this.tagName !== tag.toUpperCase()) return false;
      const actual = this.getAttribute(attr);
      if (actual === null) return false;
      if (!op) return true;
      if (op === "=") return actual === val;
      if (op === "*=") return actual.includes(val);
      return false;
    }

    // Simple tag selector
    return this.tagName === s.toUpperCase();
  }

  closest(selector) {
    let curr = this;
    while (curr) {
      if (curr.matches(selector)) return curr;
      curr = curr.parentElement;
    }
    return null;
  }

  querySelectorAll(selector) {
    const results = [];
    function search(node) {
      for (const child of node.children) {
        if (child.matches(selector)) {
          results.push(child);
        }
        search(child);
      }
    }
    search(this);
    return results;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }
}

class MockDocument extends MockNode {
  constructor() {
    super({ tag: "DOCUMENT" });
    this.head = new MockNode({ tag: "HEAD" });
    this.body = new MockNode({ tag: "BODY" });
    this.appendChild(this.head);
    this.appendChild(this.body);
    this.title = "";
  }
}

async function createEnvironment({ url = "https://www.corsematin.com/article/politique/123/filoni", title = "Test Article" } = {}) {
  const [navSource, adapterSource] = await Promise.all([
    fs.readFile(NAVIGATION_PATH, "utf8"),
    fs.readFile(ADAPTER_PATH, "utf8"),
  ]);

  const document = new MockDocument();
  document.title = title;

  const sandbox = {
    window: {
      location: new URL(url),
    },
    location: new URL(url),
    document,
    Element: MockNode,
    URL,
    console,
    setTimeout,
    clearTimeout,
  };
  sandbox.window.document = document;

  vm.createContext(sandbox);
  vm.runInContext(navSource, sandbox);
  vm.runInContext(adapterSource, sandbox);

  return {
    sandbox,
    document,
    adapter: sandbox.window.__cogentiaNavigationAssistant.adapters.corsematin,
  };
}

test("cogentia#190: isCorseMatin accurately classifies corsematin.com and rejects others", async () => {
  const { adapter } = await createEnvironment({ url: "https://www.corsematin.com/article/politique/123" });
  assert.equal(adapter.isCorseMatin("https://www.corsematin.com/article/foo"), true);
  assert.equal(adapter.isCorseMatin("https://corsematin.com/article/foo"), true);
  assert.equal(adapter.isCorseMatin("https://sur.corsematin.com/abc"), true);
  assert.equal(adapter.isCorseMatin("https://lemonde.fr/article/foo"), false);
  assert.equal(adapter.isCorseMatin("https://facebook.com/corsematin"), false);
  assert.equal(adapter.isCorseMatin("not-a-url"), false);
});

test("cogentia#190: article() on non-Corse-Matin page safely degrades with unknown access", async () => {
  const { adapter } = await createEnvironment({ url: "https://example.com/other" });
  const result = adapter.article();
  assert.equal(result.provider, "corse-matin");
  assert.equal(result.kind, "news-article");
  assert.equal(result.canonicalUrl, null);
  assert.equal(result.access, "unknown");
  assert.equal(result.evidence.reason, "not-corsematin-page");
});

test("cogentia#190: links() on non-Corse-Matin page returns empty list", async () => {
  const { adapter } = await createEnvironment({ url: "https://example.com/other" });
  const result = adapter.links();
  assert.equal(result.length, 0);
});

test("cogentia#190: article() extracts NewsArticle JSON-LD with restricted paywall detection", async () => {
  const { adapter, document } = await createEnvironment({
    url: "https://www.corsematin.com/article/politique/4523963496035760/je-ne-pouvais-plus-cautionner",
    title: "François Filoni explique sa démission",
  });

  // Add JSON-LD script
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: "François Filoni explique pourquoi il a démissionné du bureau national du RN",
    description: "L'élu d'Ajaccio quitte les instances du Rassemblement national.",
    datePublished: "2026-09-17T06:00:00+02:00",
    dateModified: "2026-09-17T06:00:00+02:00",
    articleSection: "Politique",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": "https://www.corsematin.com/article/politique/4523963496035760/je-ne-pouvais-plus-cautionner",
    },
    author: [{ "@type": "Person", name: "Jean-Pierre Girolami" }],
    isAccessibleForFree: false,
    hasPart: {
      "@type": "WebPageElement",
      isAccessibleForFree: false,
      cssSelector: ".article-paywall",
    },
  };
  const scriptEl = new MockNode({
    tag: "SCRIPT",
    attrs: { type: "application/ld+json" },
    text: JSON.stringify(jsonLd),
  });
  document.head.appendChild(scriptEl);

  // Add article DOM with paywall container
  const articleEl = new MockNode({ tag: "ARTICLE" });
  const p1 = new MockNode({ tag: "P", text: "Premier paragraphe visible de l'article." });
  const p2 = new MockNode({ tag: "P", text: "Deuxième paragraphe expliquant les motifs politiques." });
  const paywallDiv = new MockNode({
    tag: "DIV",
    attrs: { class: "article-paywall" },
    text: "Cet article est réservé aux abonnés. Déjà abonné ? Connectez-vous",
  });
  articleEl.appendChild(p1);
  articleEl.appendChild(p2);
  articleEl.appendChild(paywallDiv);
  document.body.appendChild(articleEl);

  const article = adapter.article();

  assert.equal(article.provider, "corse-matin");
  assert.equal(article.kind, "news-article");
  assert.equal(article.canonicalUrl, "https://www.corsematin.com/article/politique/4523963496035760/je-ne-pouvais-plus-cautionner");
  assert.equal(article.headline, "François Filoni explique pourquoi il a démissionné du bureau national du RN");
  assert.equal(article.author, "Jean-Pierre Girolami");
  assert.equal(article.publishedAt, "2026-09-17T06:00:00+02:00");
  assert.equal(article.modifiedAt, "2026-09-17T06:00:00+02:00");
  assert.equal(article.section, "Politique");
  assert.equal(article.access, "restricted");
  assert.equal(article.evidence.jsonLd, true);
  assert.equal(article.evidence.semanticDom, true);
  assert.equal(article.evidence.strategy, "json-ld+dom");
  assert.ok(article.text.includes("Premier paragraphe visible"));
  assert.ok(article.text.includes("Deuxième paragraphe expliquant"));
  // Paywall promo text must not be included in article text
  assert.ok(!article.text.includes("réservé aux abonnés"));
});

test("cogentia#190: article() falls back to OpenGraph and semantic DOM when JSON-LD is absent", async () => {
  const { adapter, document } = await createEnvironment({
    url: "https://www.corsematin.com/article/sports/999/football-scb",
  });

  // OpenGraph tags
  document.head.appendChild(new MockNode({ tag: "META", attrs: { property: "og:title", content: "SC Bastia victoire" } }));
  document.head.appendChild(new MockNode({ tag: "META", attrs: { property: "og:description", content: "Résumé du match." } }));
  document.head.appendChild(new MockNode({ tag: "META", attrs: { property: "og:url", content: "https://www.corsematin.com/article/sports/999/football-scb" } }));
  document.head.appendChild(new MockNode({ tag: "META", attrs: { property: "article:published_time", content: "2026-09-18T12:00:00Z" } }));
  document.head.appendChild(new MockNode({ tag: "META", attrs: { property: "article:section", content: "Sports" } }));
  document.head.appendChild(new MockNode({ tag: "META", attrs: { name: "author", content: "Rédaction Sport" } }));

  // DOM article without paywall
  const articleEl = new MockNode({ tag: "ARTICLE" });
  articleEl.appendChild(new MockNode({ tag: "P", text: "Le Sporting Club de Bastia s'est imposé 2-0." }));
  document.body.appendChild(articleEl);

  const article = adapter.article();

  assert.equal(article.provider, "corse-matin");
  assert.equal(article.headline, "SC Bastia victoire");
  assert.equal(article.description, "Résumé du match.");
  assert.equal(article.author, "Rédaction Sport");
  assert.equal(article.publishedAt, "2026-09-18T12:00:00Z");
  assert.equal(article.section, "Sports");
  assert.equal(article.access, "public");
  assert.equal(article.evidence.jsonLd, false);
  assert.equal(article.evidence.openGraph, true);
  assert.equal(article.evidence.strategy, "open-graph+dom");
  assert.equal(article.text, "Le Sporting Club de Bastia s'est imposé 2-0.");
});

test("cogentia#190: article() DOM fallback extracts h1, time, and author from class attributes", async () => {
  const { adapter, document } = await createEnvironment({
    url: "https://www.corsematin.com/article/faits-divers/555/accident",
  });

  const h1 = new MockNode({ tag: "H1", text: "Intervention des secours à Ajaccio" });
  const authorSpan = new MockNode({ tag: "SPAN", attrs: { class: "article__author-name" }, text: "Par Paul Battesti" });
  const timeEl = new MockNode({ tag: "TIME", attrs: { datetime: "2026-09-18T08:30:00Z" }, text: "18 sept. 2026" });

  const articleEl = new MockNode({ tag: "ARTICLE" });
  articleEl.appendChild(h1);
  articleEl.appendChild(authorSpan);
  articleEl.appendChild(timeEl);
  articleEl.appendChild(new MockNode({ tag: "P", text: "Les pompiers sont intervenus ce matin." }));
  document.body.appendChild(articleEl);

  const article = adapter.article();

  assert.equal(article.headline, "Intervention des secours à Ajaccio");
  assert.equal(article.author, "Paul Battesti"); // Stripped 'Par ' prefix
  assert.equal(article.publishedAt, "2026-09-18T08:30:00Z");
  assert.equal(article.evidence.strategy, "semantic-dom");
  assert.equal(article.access, "public");
});

test("cogentia#190: missing metadata stays null rather than being invented", async () => {
  const { adapter, document } = await createEnvironment({
    url: "https://www.corsematin.com/article/politique/777/minimal",
  });

  const articleEl = new MockNode({ tag: "ARTICLE" });
  articleEl.appendChild(new MockNode({ tag: "H1", text: "Titre minimal" }));
  articleEl.appendChild(new MockNode({ tag: "P", text: "Contenu sans auteur ni date." }));
  document.body.appendChild(articleEl);

  const article = adapter.article();

  assert.equal(article.headline, "Titre minimal");
  assert.equal(article.description, null);
  assert.equal(article.author, null);
  assert.equal(article.publishedAt, null);
  assert.equal(article.modifiedAt, null);
  assert.equal(article.section, null);
  assert.equal(article.access, "public");
});

test("cogentia#190: links() extracts candidate article cards with section and restriction flag", async () => {
  const { adapter, document } = await createEnvironment({
    url: "https://www.corsematin.com/politique",
  });

  // Card 1: Article public
  const card1 = new MockNode({ tag: "DIV", attrs: { class: "card" } });
  const a1 = new MockNode({
    tag: "A",
    attrs: { href: "/article/politique/101/motion-autonomie" },
    children: [new MockNode({ tag: "H2", text: "Débat à l'Assemblée sur l'autonomie" })],
  });
  const time1 = new MockNode({ tag: "TIME", attrs: { datetime: "2026-09-18T10:00:00Z" } });
  card1.appendChild(a1);
  card1.appendChild(time1);

  // Card 2: Article abonné avec badge
  const card2 = new MockNode({ tag: "DIV", attrs: { class: "card" } });
  const a2 = new MockNode({
    tag: "A",
    attrs: { href: "/article/politique/102/interview-exclusive" },
    children: [new MockNode({ tag: "H2", text: "Interview exclusive du président" })],
  });
  const badgeAbonne = new MockNode({ tag: "SPAN", attrs: { class: "badge-abonne" }, text: "Réservé aux abonnés" });
  card2.appendChild(a2);
  card2.appendChild(badgeAbonne);

  // Link 3: Non-article link (category root)
  const a3 = new MockNode({
    tag: "A",
    attrs: { href: "/article/politique" },
    text: "Toute la politique",
  });

  document.body.appendChild(card1);
  document.body.appendChild(card2);
  document.body.appendChild(a3);

  const links = adapter.links({ limit: 10 });

  assert.equal(links.length, 2);

  assert.equal(links[0].canonicalUrl, "https://www.corsematin.com/article/politique/101/motion-autonomie");
  assert.equal(links[0].headline, "Débat à l'Assemblée sur l'autonomie");
  assert.equal(links[0].section, "politique");
  assert.equal(links[0].publishedAt, "2026-09-18T10:00:00Z");
  assert.equal(links[0].isRestrictedCandidate, false);

  assert.equal(links[1].canonicalUrl, "https://www.corsematin.com/article/politique/102/interview-exclusive");
  assert.equal(links[1].headline, "Interview exclusive du président");
  assert.equal(links[1].section, "politique");
  assert.equal(links[1].isRestrictedCandidate, true);
});
