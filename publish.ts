const dryRun = Bun.argv[2] === '--real' ? '' : '--dry-run';

await Bun.$`
cd ./packages/lib
bun publish --access public --tag latest ${dryRun}
`

await Bun.$`
cd ./packages/routing
bun publish --access public --tag latest ${dryRun}
`

await Bun.$`
cd ./packages/runtime
bun publish --access public --tag latest ${dryRun}
`

await Bun.$`
cd ./packages/cookies
bun publish --access public --tag latest ${dryRun}
`

await Bun.$`
cd ./packages/session
bun publish --access public --tag latest ${dryRun}
`

await Bun.$`
cd ./packages/cli
bun publish --access public --tag latest ${dryRun}
`
