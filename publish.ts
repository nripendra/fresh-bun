await Bun.$`
cd ./packages/lib
bun publish --dry-run
`

await Bun.$`
cd ./packages/routing
bun publish --dry-run
`

await Bun.$`
cd ./packages/runtime
bun publish --dry-run
`

await Bun.$`
cd ./packages/cookies
bun publish --dry-run
`

await Bun.$`
cd ./packages/session
bun publish --dry-run
`

await Bun.$`
cd ./packages/cli
bun publish --dry-run
`