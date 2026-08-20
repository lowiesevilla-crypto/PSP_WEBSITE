import fs from "node:fs";

const path = "runtime-audit.json";
if (!fs.existsSync(path)) {
  console.error("runtime-audit.json was not generated.");
  process.exit(1);
}

const audit = JSON.parse(fs.readFileSync(path, "utf8"));
const vulnerabilities = audit.vulnerabilities ?? {};

// npm currently reports GHSA-ggr8-5vv4-36mx through Prisma's CLI/config toolchain
// even when development dependencies are omitted/pruned. Prisma CLI is not shipped
// as application runtime code. Keep this allow-list deliberately narrow and fail on
// any other HIGH/CRITICAL production finding.
const devToolOnlyAllowList = new Set(["prisma", "@prisma/config", "deepmerge-ts"]);
const blocking = [];

for (const [name, finding] of Object.entries(vulnerabilities)) {
  const severity = String(finding.severity ?? "").toLowerCase();
  if (!new Set(["high", "critical"]).has(severity)) continue;
  if (devToolOnlyAllowList.has(name)) continue;
  blocking.push({ name, severity, via: finding.via });
}

if (blocking.length > 0) {
  console.error("Blocking HIGH/CRITICAL runtime dependency findings detected:");
  console.error(JSON.stringify(blocking, null, 2));
  process.exit(1);
}

console.log("Runtime dependency audit gate passed.");
if (Object.keys(vulnerabilities).some((name) => devToolOnlyAllowList.has(name))) {
  console.log("Known Prisma CLI/config development-tool advisory remains tracked but is not a deployed runtime dependency.");
}
