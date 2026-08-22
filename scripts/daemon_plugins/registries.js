import { buildRegistryGraph, checkRegistryGraph, findRegistry, relatedRegistries } from "../corpus-registries.js";

export const plugin = {
  name: "registries",
  class: "corpus-read",
  title: "Distributed Registry Graph",
  description: "Read-only daemon projection of distributed *.registry.yaml declarations.",
  version: "0.1.0",
};

function corpusRoot(ctx) {
  return ctx?.rootPath || process.env.COGENTIA_CORPUS_ROOT || process.cwd() + "/..";
}

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function cleanRegistry(registry, root) {
  if (!registry) return null;
  const { _source_file, _raw, ...rest } = registry;
  return { ...rest, descriptor_file: _source_file ? _source_file.replace(root, "").replace(/^[/\\]+/, "").replaceAll("\\", "/") : null };
}

function graphFor(ctx) {
  return buildRegistryGraph(corpusRoot(ctx));
}

function facetMatches(registry, facet, value) {
  if (!facet || value == null) return true;
  const actual = registry?.facets?.[facet];
  if (Array.isArray(actual)) return actual.map(String).includes(String(value));
  return actual != null && String(actual) === String(value);
}

export const routes = [
  {
    method: "GET",
    path: "/api/registries/list",
    handler: async (_req, res, ctx, url) => {
      const graph = graphFor(ctx);
      const facet = url.searchParams.get("facet");
      const value = url.searchParams.get("value");
      const registries = graph.registries.filter(r => facetMatches(r, facet, value)).map(r => cleanRegistry(r, graph.root));
      json(res, 200, { ok: graph.errors.length === 0, schema: graph.schema, count: registries.length, registries, errors: graph.errors, warnings: graph.warnings });
    },
  },
  {
    method: "GET",
    path: "/api/registries/check",
    handler: async (_req, res, ctx) => {
      const graph = graphFor(ctx);
      json(res, 200, checkRegistryGraph(graph));
    },
  },
  {
    method: "GET",
    path: "/api/registries/show",
    handler: async (_req, res, ctx, url) => {
      const id = String(url.searchParams.get("id") || "");
      if (!id) return json(res, 400, { ok: false, error: "missing_id" });
      const graph = graphFor(ctx);
      const result = findRegistry(graph, id);
      if (!result.ok) return json(res, result.status === "not_found" ? 404 : 409, { ...result, matches: (result.matches || []).map(r => cleanRegistry(r, graph.root)) });
      json(res, 200, { ...result, registry: cleanRegistry(result.registry, graph.root), matches: undefined });
    },
  },
  {
    method: "GET",
    path: "/api/registries/related",
    handler: async (_req, res, ctx, url) => {
      const id = String(url.searchParams.get("id") || "");
      const direction = String(url.searchParams.get("direction") || "both");
      if (!id) return json(res, 400, { ok: false, error: "missing_id" });
      const graph = graphFor(ctx);
      const result = relatedRegistries(graph, id, { direction });
      json(res, result.ok ? 200 : 400, { ...result, relations: (result.relations || []).map(r => ({ subject: r.subject, predicate: r.predicate, object: r.object })) });
    },
  },
];
