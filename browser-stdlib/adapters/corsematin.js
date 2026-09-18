(() => {
  const navigation = window.__cogentiaNavigationAssistant;
  if (!navigation) throw new Error("Cogentia navigation stdlib is required before the Corse-Matin adapter");

  function compact(text, limit = 20_000) {
    return String(text || "").replace(/\s+/g, " ").trim().slice(0, limit);
  }

  function isCorseMatin(url = window.location.href) {
    try {
      const parsed = new URL(url);
      return /(^|\.)corsematin\.com$/i.test(parsed.hostname);
    } catch {
      return false;
    }
  }

  function findJsonLdArticle() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const parsed = JSON.parse(script.textContent);
        const candidates = Array.isArray(parsed) ? parsed : (parsed?.["@graph"] || [parsed]);
        for (const item of candidates) {
          if (!item || typeof item !== "object") continue;
          const type = item["@type"];
          const isArticle = type === "NewsArticle" || type === "Article" || type === "ReportageNewsArticle"
            || (Array.isArray(type) && (type.includes("NewsArticle") || type.includes("Article")));
          if (isArticle) return item;
        }
      } catch {
        // Skip unparseable JSON-LD blocks
      }
    }
    return null;
  }

  function getMeta(names) {
    for (const name of names) {
      const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
      const content = el?.getAttribute("content")?.trim();
      if (content) return content;
    }
    return null;
  }

  function extractArticleText(articleEl, limit = 20_000) {
    if (!articleEl) return "";
    const paragraphs = [...articleEl.querySelectorAll("p")]
      .filter((p) => {
        if (p.closest(".article-paywall, [data-paywall], .paywall, footer, aside, nav, .comments, .poool-widget")) {
          return false;
        }
        const text = p.innerText?.trim() || p.textContent?.trim() || "";
        if (/^Cet article est réservé aux abonnés/i.test(text)) return false;
        return text.length > 0;
      })
      .map((p) => (p.innerText?.trim() || p.textContent?.trim() || ""));
    return compact(paragraphs.join("\n\n"), limit);
  }

  function detectAccess(jsonLd, articleEl) {
    const jsonLdRestricted = Boolean(
      jsonLd && (
        jsonLd.isAccessibleForFree === false ||
        jsonLd.isAccessibleForFree === "false" ||
        jsonLd.isAccessibleForFree === "False" ||
        jsonLd.hasPart?.isAccessibleForFree === false ||
        jsonLd.hasPart?.isAccessibleForFree === "false" ||
        jsonLd.hasPart?.isAccessibleForFree === "False"
      )
    );

    const paywallDom = document.querySelector(
      '.article-paywall, [data-paywall], .paywall, #paywall, .poool-widget, [class*="abonne-gate"], [class*="metered-paywall"]'
    );
    const subscriberText = Boolean(
      paywallDom && /réservé aux abonnés|abonnez-vous|connectez-vous/i.test(paywallDom.innerText || paywallDom.textContent || "")
    );

    if (jsonLdRestricted || subscriberText || paywallDom) {
      // Conservative read boundary: report restricted when paywall markers are present.
      // Do not attempt to bypass or speculate on authentication unless explicit unlocked status exists.
      return "restricted";
    }

    if (jsonLd?.isAccessibleForFree === true || (!jsonLdRestricted && !paywallDom && articleEl)) {
      return "public";
    }

    return "unknown";
  }

  function article(options = {}) {
    const limit = typeof options.limit === "number" && options.limit > 0 ? options.limit : 20_000;

    if (!isCorseMatin()) {
      return {
        provider: "corse-matin",
        kind: "news-article",
        canonicalUrl: null,
        headline: null,
        description: null,
        author: null,
        publishedAt: null,
        modifiedAt: null,
        section: null,
        text: "",
        access: "unknown",
        evidence: {
          jsonLd: false,
          openGraph: false,
          semanticDom: false,
          strategy: "none",
          reason: "not-corsematin-page",
        },
      };
    }

    const jsonLd = findJsonLdArticle();
    const canonicalLink = document.querySelector('link[rel="canonical"]')?.getAttribute("href") || null;
    const ogUrl = getMeta(["og:url"]);
    const canonicalUrl = jsonLd?.mainEntityOfPage?.["@id"]
      || (typeof jsonLd?.mainEntityOfPage === "string" ? jsonLd.mainEntityOfPage : null)
      || canonicalLink
      || ogUrl
      || window.location.href;

    const headline = jsonLd?.headline
      || getMeta(["og:title", "twitter:title"])
      || document.querySelector("h1")?.innerText?.trim()
      || document.querySelector("h1")?.textContent?.trim()
      || null;

    const description = jsonLd?.description
      || getMeta(["og:description", "description", "twitter:description"])
      || null;

    let author = null;
    if (jsonLd?.author) {
      const authors = Array.isArray(jsonLd.author) ? jsonLd.author : [jsonLd.author];
      author = authors
        .map((a) => (typeof a === "string" ? a : a?.name))
        .filter(Boolean)
        .join(", ") || null;
    }
    if (!author) {
      const metaAuthor = getMeta(["article:author", "author"]);
      if (metaAuthor) {
        author = metaAuthor;
      } else {
        const domAuthor = document.querySelector('.article__author-name, [rel="author"], [class*="author"], [class*="auteur"]')
          ?.innerText?.replace(/^Par\s+/i, "")?.trim()
          || document.querySelector('.article__author-name, [rel="author"], [class*="author"], [class*="auteur"]')
          ?.textContent?.replace(/^Par\s+/i, "")?.trim()
          || null;
        if (domAuthor) author = domAuthor;
      }
    }

    const publishedAt = jsonLd?.datePublished
      || getMeta(["article:published_time"])
      || document.querySelector("time[datetime]")?.getAttribute("datetime")
      || document.querySelector("time")?.innerText?.trim()
      || document.querySelector("time")?.textContent?.trim()
      || null;

    const modifiedAt = jsonLd?.dateModified
      || getMeta(["article:modified_time"])
      || null;

    const section = jsonLd?.articleSection
      || getMeta(["article:section"])
      || null;

    const articleEl = document.querySelector("article")
      || document.querySelector('[role="article"]')
      || document.querySelector("main");

    const text = extractArticleText(articleEl, limit);
    const access = detectAccess(jsonLd, articleEl);

    const hasOg = Boolean(getMeta(["og:title", "og:url", "og:description"]));
    const hasDom = Boolean(articleEl);

    let strategy = "none";
    if (jsonLd && hasDom) strategy = "json-ld+dom";
    else if (jsonLd) strategy = "json-ld";
    else if (hasOg && hasDom) strategy = "open-graph+dom";
    else if (hasOg) strategy = "open-graph";
    else if (hasDom) strategy = "semantic-dom";
    else strategy = "fallback";

    return {
      provider: "corse-matin",
      kind: "news-article",
      canonicalUrl,
      headline,
      description,
      author,
      publishedAt,
      modifiedAt,
      section,
      text,
      access,
      evidence: {
        jsonLd: Boolean(jsonLd),
        openGraph: hasOg,
        semanticDom: hasDom,
        strategy,
      },
    };
  }

  function links(options = {}) {
    const limit = typeof options.limit === "number" && options.limit > 0 ? options.limit : 50;

    if (!isCorseMatin()) {
      return [];
    }

    const seen = new Set();
    const results = [];
    const sourceUrl = window.location.href;
    const anchors = document.querySelectorAll('a[href*="/article/"]');

    for (const a of anchors) {
      try {
        const href = a.href || a.getAttribute("href");
        if (!href) continue;
        const resolvedUrl = new URL(href, window.location.href).href;
        if (seen.has(resolvedUrl)) continue;

        // Exclude category root paths like /article/politique or /article/sports
        const path = new URL(resolvedUrl).pathname;
        const parts = path.split("/").filter(Boolean);
        if (parts.length < 3 || parts[0] !== "article") continue;

        const headingEl = a.querySelector('h1, h2, h3, h4, h5, .headline, [class*="title"]');
        const headline = headingEl?.innerText?.trim()
          || headingEl?.textContent?.trim()
          || a.innerText?.trim()
          || a.textContent?.trim()
          || "";

        if (!headline || headline.length < 10) continue;

        seen.add(resolvedUrl);

        const card = a.closest('article, [class*="card"], [class*="item"], li') || a;
        const timeEl = card.querySelector("time");
        const publishedAt = timeEl?.getAttribute("datetime")
          || timeEl?.innerText?.trim()
          || timeEl?.textContent?.trim()
          || null;

        const section = parts[1] || null;

        const cardText = card.innerText || card.textContent || "";
        const isRestrictedCandidate = Boolean(
          card.querySelector('[class*="abonne"], [class*="lock"], [aria-label*="abonn"]')
          || /réservé aux abonnés|abonnés/i.test(cardText)
        );

        results.push({
          canonicalUrl: resolvedUrl,
          headline: compact(headline, 240),
          section,
          publishedAt,
          sourceUrl,
          isRestrictedCandidate,
        });

        if (results.length >= limit) break;
      } catch {
        // Skip invalid URL / unparseable anchor
      }
    }

    return results;
  }

  Object.defineProperty(navigation.adapters, "corsematin", {
    value: Object.freeze({
      version: "0.1.0",
      isCorseMatin,
      article,
      links,
    }),
    configurable: true,
    enumerable: false,
  });
})();
