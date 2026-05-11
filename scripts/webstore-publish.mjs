import fs from "node:fs/promises";
import path from "node:path";

const API_BASE = "https://chromewebstore.googleapis.com";

function usage() {
  console.log(`SnapTab Web Store CLI

Usage:
  node scripts/webstore-publish.mjs upload --publisher <publisherId> --extension <extensionId> [--zip <file>]
  node scripts/webstore-publish.mjs status --publisher <publisherId> --extension <extensionId>
  node scripts/webstore-publish.mjs publish --publisher <publisherId> --extension <extensionId> [--target trustedTesters]

Auth:
  Either set CWS_ACCESS_TOKEN, or set all of:
  CWS_CLIENT_ID, CWS_CLIENT_SECRET, CWS_REFRESH_TOKEN
`);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const map = new Map();
  for (let i = 0; i < rest.length; i += 1) {
    const part = rest[i];
    if (!part.startsWith("--")) {
      continue;
    }
    const key = part.slice(2);
    const value = rest[i + 1] && !rest[i + 1].startsWith("--") ? rest[++i] : "true";
    map.set(key, value);
  }
  return {
    command,
    publisherId: map.get("publisher"),
    extensionId: map.get("extension"),
    zipPath: map.get("zip"),
    target: map.get("target")
  };
}

async function getAccessToken() {
  if (process.env.CWS_ACCESS_TOKEN) {
    return process.env.CWS_ACCESS_TOKEN;
  }

  const clientId = process.env.CWS_CLIENT_ID;
  const clientSecret = process.env.CWS_CLIENT_SECRET;
  const refreshToken = process.env.CWS_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing auth env. Set CWS_ACCESS_TOKEN or OAuth refresh token envs.");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    throw new Error(`OAuth token request failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error("OAuth response missing access_token.");
  }
  return data.access_token;
}

function assertRequired(value, label) {
  if (!value) {
    throw new Error(`Missing required argument: ${label}`);
  }
}

function itemPath(publisherId, extensionId) {
  return `publishers/${publisherId}/items/${extensionId}`;
}

async function uploadPackage({ publisherId, extensionId, zipPath, token }) {
  const finalZip = zipPath ? path.resolve(process.cwd(), zipPath) : path.resolve(process.cwd(), "release/snaptab-v0.1.0.zip");
  const zipBuffer = await fs.readFile(finalZip);
  const url = `${API_BASE}/upload/v2/${itemPath(publisherId, extensionId)}:upload`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/zip"
    },
    body: zipBuffer
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${JSON.stringify(json)}`);
  }
  return json;
}

async function fetchStatus({ publisherId, extensionId, token }) {
  const url = `${API_BASE}/v2/${itemPath(publisherId, extensionId)}:fetchStatus`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(`Status failed: ${response.status} ${JSON.stringify(json)}`);
  }
  return json;
}

async function publishItem({ publisherId, extensionId, token, target }) {
  const url = `${API_BASE}/v2/${itemPath(publisherId, extensionId)}:publish`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      target: target === "trustedTesters" ? "TRUSTED_TESTERS" : "DEFAULT"
    })
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(`Publish failed: ${response.status} ${JSON.stringify(json)}`);
  }
  return json;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.command || args.command === "--help" || args.command === "help") {
    usage();
    return;
  }

  assertRequired(args.publisherId, "--publisher");
  assertRequired(args.extensionId, "--extension");
  const token = await getAccessToken();

  if (args.command === "upload") {
    const payload = await uploadPackage({
      publisherId: args.publisherId,
      extensionId: args.extensionId,
      zipPath: args.zipPath,
      token
    });
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (args.command === "status") {
    const payload = await fetchStatus({
      publisherId: args.publisherId,
      extensionId: args.extensionId,
      token
    });
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (args.command === "publish") {
    const payload = await publishItem({
      publisherId: args.publisherId,
      extensionId: args.extensionId,
      token,
      target: args.target
    });
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  throw new Error(`Unsupported command: ${args.command}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
