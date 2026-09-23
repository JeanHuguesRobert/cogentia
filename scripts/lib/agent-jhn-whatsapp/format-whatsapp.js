/**
 * WhatsApp's text UI does not render Markdown link syntax `[label](url)` —
 * it shows the literal brackets and parentheses. It does auto-linkify bare
 * `http(s)://` URLs into tappable links. Convert one into the other so
 * citations stay clickable on WhatsApp.
 */

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

export function markdownLinksToWhatsAppText(text) {
  const input = String(text || "");
  return input.replace(MARKDOWN_LINK_RE, (_match, label, url) => {
    const trimmedLabel = String(label || "").trim();
    if (!trimmedLabel || trimmedLabel === url) return url;
    return `${trimmedLabel}: ${url}`;
  });
}
