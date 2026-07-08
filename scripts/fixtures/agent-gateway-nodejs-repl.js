#!/usr/bin/env node

import repl from "node:repl";

repl.start({
  prompt: "> ",
  ignoreUndefined: true,
});