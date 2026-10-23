import "./memory-capture.js";
import { invokeCapability } from "./v3-modules.js";

export const MEMORY_CAPTURE_MAX_BYTES = 256 * 1024;

function inputError(message, error_class = "invalid_input") {
  return Object.assign(new Error(message), { error_class });
}

export function validateMemoryCaptureSize(bytes) {
  if (bytes > MEMORY_CAPTURE_MAX_BYTES) {
    throw inputError("memory.capture text exceeds the 262144-byte UTF-8 limit", "payload_too_large");
  }
}

export function captureMemoryForSurface(args, auth) {
  if (!args || typeof args !== "object" || Array.isArray(args) ||
      Object.keys(args).some((key) => key !== "text") || typeof args.text !== "string") {
    throw inputError("memory.capture requires only a text string");
  }
  validateMemoryCaptureSize(Buffer.byteLength(args.text, "utf8"));
  return invokeCapability("memory.capture", { text: args.text }, {
    auth, moduleId: "memory.capture.kys-ami",
  });
}

export async function readMemoryCaptureStdin(stream) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, "utf8");
    bytes += buffer.length;
    validateMemoryCaptureSize(bytes);
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}
