(() => {
  const ARIA_ATTRIBUTES = [
    "aria-label", "aria-labelledby", "aria-describedby", "aria-description",
    "aria-controls", "aria-owns", "aria-expanded", "aria-pressed",
    "aria-selected", "aria-checked", "aria-current", "aria-disabled",
    "aria-readonly", "aria-required", "aria-multiline", "aria-haspopup",
    "aria-live", "aria-busy", "aria-modal",
  ];

  function textByIds(value) {
    if (!value) return "";
    return value.split(/\s+/).map((id) => {
      const node = document.getElementById(id);
      return node?.innerText?.trim() || node?.textContent?.trim() || "";
    }).filter(Boolean).join(" ").slice(0, 240);
  }

  function elementSignature(element) {
    if (!(element instanceof Element)) return null;
    const aria = Object.fromEntries(ARIA_ATTRIBUTES.map((name) => [name, element.getAttribute(name)]).filter(([, value]) => value !== null));
    const nativeLabel = element.labels ? [...element.labels].map((label) => label.innerText?.trim() || label.textContent?.trim() || "").filter(Boolean).join(" ") : "";
    const ancestors = [];
    let parent = element.parentElement;
    while (parent && ancestors.length < 4) {
      const role = parent.getAttribute("role");
      const ariaLabel = parent.getAttribute("aria-label");
      const testid = parent.getAttribute("data-testid");
      if (role || ariaLabel || testid || /^(FORM|DIALOG|MAIN|NAV|ASIDE|HEADER|FOOTER)$/i.test(parent.tagName)) ancestors.push({ tag: parent.tagName, role, ariaLabel, testid });
      parent = parent.parentElement;
    }
    return {
      tag: element.tagName,
      role: element.getAttribute("role"),
      id: element.id || null,
      name: element.getAttribute("name"),
      testid: element.getAttribute("data-testid"),
      ariaLabel: element.getAttribute("aria-label"),
      aria,
      accessibleName: aria["aria-label"] || textByIds(aria["aria-labelledby"]) || nativeLabel || element.getAttribute("alt") || element.getAttribute("title") || element.getAttribute("placeholder") || "",
      placeholder: element.getAttribute("placeholder"),
      inputType: element.getAttribute("type"),
      contentEditable: Boolean(element.isContentEditable),
      ancestors,
    };
  }

  const api = {
    version: "0.2.2",
    // Adapters are intentionally extensible while the generic API itself is
    // frozen. Site-specific code must not mutate generic capabilities.
    adapters: Object.create(null),
    // Site adapters may return semantic descriptions without exposing a DOM
    // node or depending on a page-specific selector outside their boundary.
    elementSignature,
    context() {
      const active = document.activeElement;
      return {
        url: location.href,
        title: document.title,
        selection: window.getSelection()?.toString() || "",
        activeElement: elementSignature(active),
      };
    },
    activeElement() { return document.activeElement; },
    isEditable(element = document.activeElement) {
      return Boolean(element && (["INPUT", "TEXTAREA"].includes(element.tagName) || element.isContentEditable));
    },
    insertText(text) {
      try {
        if (!api.isEditable()) return { ok: false, error: "active element is not editable" };
        const ok = document.execCommand("insertText", false, String(text));
        return { ok, active: api.context().activeElement };
      } catch (error) { return { ok: false, error: error.message }; }
    },
    visibleText(limit = 12000) { return (document.body?.innerText || "").slice(0, limit); },
    observe() {
      if (window.__cogentiaNavigationObserved) return;
      if (document.documentElement?.getAttribute("data-cogentia-observed") === "content") {
        window.__cogentiaNavigationObserved = true;
        return;
      }
      window.__cogentiaNavigationObserved = true;
      document.documentElement?.setAttribute("data-cogentia-observed", "stdlib");
      const emit = (type, extra = {}) => window.CogentiaBridgeEvent?.(JSON.stringify({ type, context: { ...api.context(), selection: "" }, ...extra }));
      document.addEventListener("focusin", (event) => emit("focusChanged", { relatedTarget: elementSignature(event.relatedTarget), target: elementSignature(event.target) }), true);
      let selectionAt = 0;
      document.addEventListener("selectionchange", () => {
        const now = Date.now();
        if (now - selectionAt < 400) return;
        selectionAt = now;
        emit("selectionChanged");
      });
      window.addEventListener("pageshow", () => emit("pageShown"));
      document.addEventListener("click", (event) => {
        if (typeof event.button === "number" && event.button !== 0) return;
        emit("click", { target: elementSignature(event.target), modified: Boolean(event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) });
      }, true);
      let inputTimer = 0;
      document.addEventListener("input", (event) => {
        const target = event.target;
        if (!(target instanceof Element) || !api.isEditable(target)) return;
        clearTimeout(inputTimer);
        const signature = elementSignature(target);
        const inputType = typeof event.inputType === "string" ? event.inputType : "input";
        inputTimer = setTimeout(() => emit("fieldInput", { inputType, editable: true, target: signature }), 400);
      }, true);
      emit("observing", { via: "stdlib" });
    },
  };
  // Do not claim a generic page-global name: major sites are free to use it.
  // This assistant-owned, deliberately unlikely namespace is the stable bridge
  // contract between the local assistant and its injected stdlib.
  Object.defineProperty(window, "__cogentiaNavigationAssistant", { value: Object.freeze(api), configurable: true, enumerable: false });
})();
