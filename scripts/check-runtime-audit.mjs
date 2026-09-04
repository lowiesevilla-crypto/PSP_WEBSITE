import fs from "node:fs";

const path = process.env.RUNTIME_AUDIT_PATH ?? "runtime-audit.json";
const validateOnly = process.argv.includes("--validate-only");

if (!fs.existsSync(path)) {
  console.error(`${path} was not generated.`);
  process.exit(1);
}

let audit;
try {
  audit = JSON.parse(fs.readFileSync(path, "utf8"));
} catch (error) {
  console.error(`${path} is not valid npm audit JSON.`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

if (!audit || typeof audit !== "object" || Array.isArray(audit)) {
  console.error("Runtime dependency audit payload is not a JSON object.");
  process.exit(1);
}

if (audit.error) {
  console.error("npm audit returned an operational/registry error instead of vulnerability evidence:");
  console.error(JSON.stringify(audit.error, null, 2));
  process.exit(1);
}

if (audit.auditReportVersion !== 2) {
  console.error(`Unsupported or missing npm audit report version: ${String(audit.auditReportVersion)}`);
  process.exit(1);
}

if (!audit.vulnerabilities || typeof audit.vulnerabilities !== "object" || Array.isArray(audit.vulnerabilities)) {
  console.error("npm audit payload is missing the vulnerabilities object.");
  process.exit(1);
}

if (
  !audit.metadata ||
  typeof audit.metadata !== "object" ||
  Array.isArray(audit.metadata) ||
  !audit.metadata.vulnerabilities ||
  typeof audit.metadata.vulnerabilities !== "object" ||
  Array.isArray(audit.metadata.vulnerabilities)
) {
  console.error("npm audit payload is missing vulnerability metadata.");
  process.exit(1);
}

if (validateOnly) {
  console.log("Runtime dependency audit evidence is valid npm audit vulnerability data.");
  process.exit(0);
}

const vulnerabilities = audit.vulnerabilities;

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
