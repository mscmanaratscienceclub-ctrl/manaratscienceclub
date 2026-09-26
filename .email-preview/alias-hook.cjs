const path = require("path");
const Module = require("module");
const orig = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  if (request.startsWith("@/")) {
    request = path.join(__dirname, "src", request.slice(2));
  }
  return orig.call(this, request, ...args);
};
