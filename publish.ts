const dryRun = Bun.argv.indexOf("--real") > -1 ? "" : "--dry-run";
let tag = "latest";
const indexTag = Bun.argv.indexOf("--tag");
if (indexTag > -1) {
  tag = Bun.argv[indexTag + 1] ?? "latest";
  if (!/^\w.*/.test(tag)) {
    console.log("Tag not provided");
    process.exit(1);
  }
}
let otp = "";
const indexOtp = Bun.argv.indexOf("--otp");
if (indexOtp > -1) {
  const otpValue = Bun.argv[indexOtp + 1];
  if (!/^\d+/.test(otpValue)) {
    console.log("OTP not provided");
    process.exit(1);
  }
  otp = `--otp ${otpValue}`;
}

if (Bun.argv.indexOf("--help") > -1 || Bun.argv.indexOf("-h") > -1) {
  console.log("bun run ./publish.ts [FLAGS]");
  console.log("FLAGS:");
  console.log(
    "--real - Actually publish to npm. If --real flag is not provided then it will add --dry-run flag automatically.",
  );
  console.log(
    "--tag  - Tag name to publish. https://bun.sh/docs/cli/publish#tag",
  );
  console.log(
    "--otp  - Provide one-time password. https://bun.sh/docs/cli/publish#otp",
  );
  process.exit(0);
}

await Bun.$`
cd ./packages/lib
bun publish --access public --tag ${tag} ${dryRun} ${otp}
`;

await Bun.$`
cd ./packages/routing
bun publish --access public --tag ${tag} ${dryRun} ${otp}
`;

await Bun.$`
cd ./packages/runtime
bun publish --access public --tag ${tag} ${dryRun} ${otp}
`;

await Bun.$`
cd ./packages/cookies
bun publish --access public --tag ${tag} ${dryRun} ${otp}
`;

await Bun.$`
cd ./packages/session
bun publish --access public --tag ${tag} ${dryRun} ${otp}
`;

await Bun.$`
cd ./packages/cli
bun publish --access public --tag ${tag} ${dryRun} ${otp}
`;
