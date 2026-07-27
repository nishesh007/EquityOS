/**
 * Preload: resolve `server-only` to a no-op stub for Node scripts.
 */
const Module = require("module");
const path = require("path");

const original = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "server-only") {
    return path.join(__dirname, "server-only-stub.cjs");
  }
  return original.call(this, request, parent, isMain, options);
};
