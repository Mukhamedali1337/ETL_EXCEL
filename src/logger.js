function mask(value) {
  if (value == null) return value;
  const text = String(value);
  if (text.length <= 2) return "**";
  return `${text.slice(0, 1)}***${text.slice(-1)}`;
}

function safeMssqlConfig(config) {
  if (!config || typeof config !== "object") return config;
  const cloned = JSON.parse(JSON.stringify(config));
  if (cloned.password) cloned.password = mask(cloned.password);
  if (cloned.authentication?.options?.password) {
    cloned.authentication.options.password = mask(
      cloned.authentication.options.password
    );
  }
  return cloned;
}

function isDebugEnabled() {
  const v = String(process.env.DEBUG || "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function debug(...args) {
  if (!isDebugEnabled()) return;
  // eslint-disable-next-line no-console
  console.log("[debug]", ...args);
}

function info(...args) {
  // eslint-disable-next-line no-console
  console.log("[info]", ...args);
}

function warn(...args) {
  // eslint-disable-next-line no-console
  console.warn("[warn]", ...args);
}

function error(...args) {
  // eslint-disable-next-line no-console
  console.error("[error]", ...args);
}

module.exports = {
  debug,
  info,
  warn,
  error,
  safeMssqlConfig
};

