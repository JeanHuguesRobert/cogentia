/**
 * Compose existing MCP Tasks/COP adapters without a new task store.
 * Family ownership is verified by each adapter against its canonical
 * packet-local creation event; a guessed taskId never grants access.
 */
const unknown = error => error?.code === "unknown_task" ||
  error?.code === "not_found";

export function composeMcpTasksAdapters(adapters) {
  if (!Array.isArray(adapters) || adapters.length < 1 ||
      adapters.some(x => !x || x.durable !== true ||
        ["shouldCreate", "create", "get", "update", "cancel"]
          .some(key => typeof x[key] !== "function")))
    throw new TypeError("durable_mcp_tasks_adapters_required");

  async function owner(context) {
    for (const adapter of adapters) {
      try {
        const result = await adapter.get(context);
        if (result) return adapter;
      } catch (error) {
        if (!unknown(error)) throw error;
      }
    }
    const error = new Error("unknown_task");
    error.code = "unknown_task";
    throw error;
  }
  async function creator(context) {
    for (const adapter of adapters) {
      if (await adapter.shouldCreate(context)) return adapter;
    }
    return null;
  }
  return {
    durable: true,
    async shouldCreate(context) { return Boolean(await creator(context)); },
    async create(context) {
      const adapter = await creator(context);
      if (!adapter) throw new Error("unsupported_task_creation");
      return adapter.create(context);
    },
    async get(context) { return (await owner(context)).get(context); },
    async update(context) { return (await owner(context)).update(context); },
    async cancel(context) { return (await owner(context)).cancel(context); },
  };
}
