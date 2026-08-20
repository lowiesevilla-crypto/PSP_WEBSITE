import { spawnSync } from "node:child_process";

function run(scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath], {
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("Initializing PSP production baseline...");
run("prisma/seed.mjs");

const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim();

if ((email && !password) || (!email && password)) {
  console.error(
    "BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD must either both be configured or both be removed.",
  );
  process.exit(1);
}

if (email && password) {
  console.log(`Synchronizing configured PSP System Administrator: ${email.toLowerCase()}`);
  run("scripts/bootstrap-admin.mjs");
  console.log(
    "Bootstrap administrator synchronized. Remove BOOTSTRAP_ADMIN_* after confirming the first successful production login.",
  );
} else {
  if (name) {
    console.warn(
      "BOOTSTRAP_ADMIN_NAME is configured without bootstrap email/password; administrator synchronization was skipped.",
    );
  }
  console.log("No bootstrap administrator credentials configured; continuing normally.");
}
