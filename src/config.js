const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

function parseUsers(rawValue) {
  return (rawValue || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [username, password, displayName] = entry.split(":");
      return {
        username,
        password,
        displayName: displayName || username
      };
    });
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  sessionSecret: process.env.SESSION_SECRET || "change-me-in-env",
  uploadDir: path.join(process.cwd(), "uploads"),
  ldap: {
    url: process.env.LDAP_URL || "ldap://10.10.1.251:389",
    baseDn: process.env.LDAP_BASE_DN || "DC=evrika,DC=com",
    bindDn: process.env.LDAP_BIND_DN || "",
    bindPassword: process.env.LDAP_BIND_PASSWORD || ""
  },
  mssql: {
    server: process.env.MSSQL_SERVER || "localhost",
    port: Number(process.env.MSSQL_PORT || 1433),
    database: process.env.MSSQL_DATABASE || "TrainingPortal",
    user: process.env.MSSQL_USER || "sa",
    password: process.env.MSSQL_PASSWORD || "",
    ...(String(process.env.MSSQL_AUTH_TYPE || "").toLowerCase() === "ntlm"
      ? {
          authentication: {
            type: "ntlm",
            options: {
              domain: process.env.MSSQL_DOMAIN || "",
              userName: process.env.MSSQL_USER || "",
              password: process.env.MSSQL_PASSWORD || ""
            }
          }
        }
      : {}),
    options: {
      encrypt: String(process.env.MSSQL_ENCRYPT || "false") === "true",
      trustServerCertificate:
        String(process.env.MSSQL_TRUST_SERVER_CERTIFICATE || "true") === "true"
    }
  }
};
