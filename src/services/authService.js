const { Client } = require("ldapts");
const config = require("../config");

function escapeLdapFilter(value) {
  return value.replace(/[\\*()\x00/]/g, (char) => {
    return `\\${char.charCodeAt(0).toString(16).padStart(2, "0")}`;
  });
}

async function verifyUser(username, password) {
  if (!username || !password) return null;

  const serviceClient = new Client({ url: config.ldap.url, timeout: 5000, connectTimeout: 5000 });

  try {
    // Bind with service account to find the user's DN
    await serviceClient.bind(config.ldap.bindDn, config.ldap.bindPassword);

    const { searchEntries } = await serviceClient.search(config.ldap.baseDn, {
      scope: "sub",
      filter: `(sAMAccountName=${escapeLdapFilter(username)})`,
      attributes: ["distinguishedName", "displayName", "sAMAccountName", "memberOf"],
      sizeLimit: 1
    });

    await serviceClient.unbind();

    if (searchEntries.length === 0) return null;

    const entry = searchEntries[0];

    // Verify the user's password by binding as them
    const userClient = new Client({ url: config.ldap.url, timeout: 5000, connectTimeout: 5000 });
    try {
      await userClient.bind(entry.dn, password);
      await userClient.unbind();
    } catch {
      return null;
    }

    const groups = [].concat(entry.memberOf || []).map(String);
    const isTrainer = groups.some((dn) => /^CN=Тренера,/i.test(dn));

    return {
      username: String(entry.sAMAccountName),
      displayName: String(entry.displayName || entry.sAMAccountName),
      isTrainer
    };
  } catch {
    await serviceClient.unbind().catch(() => {});
    return null;
  }
}

module.exports = { verifyUser };
