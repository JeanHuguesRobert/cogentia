import assert from "node:assert/strict";
import { createRpcPeer } from "./lib/navigation-assistant/rpc-transport.js";

const aToB = [];
const bToA = [];
const a = createRpcPeer((message) => aToB.push(message));
const b = createRpcPeer((message) => bToA.push(message), { "page.echo": ({ value }) => ({ value }) });
const pending = a.request("page.echo", { value: "ok" });
await b.receive(aToB.shift());
await a.receive(bToA.shift());
assert.deepEqual(await pending, { value: "ok" });
console.log("navigation RPC transport: ok");
