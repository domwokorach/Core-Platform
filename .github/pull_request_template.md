## Summary

<!-- What does this change do and why? Link the issue. -->

## Type
- [ ] Bug fix  - [ ] Feature  - [ ] Docs  - [ ] Tests  - [ ] CI/infra  - [ ] Refactor

## Verification (be honest: say what you ran and what happened)
- [ ] `npm run typecheck` / `npm run build`
- [ ] `mvn test`
- [ ] Playwright: <!-- which projects -->
- [ ] Manually tested: <!-- what -->

## Safety checklist
- [ ] Does not bypass the ledger, change posted entries, or weaken authentication/authorisation ([RULE.md](https://github.com/domwokorach/Core-Platform/blob/master/RULE.md))
- [ ] Customer-specific queries are scoped to the authenticated `sub`
- [ ] No secrets, tokens, real personal data or `.env` values added
- [ ] Schema changes are new Flyway migrations
- [ ] Documentation and tests updated
- [ ] Limitations or unverified areas are stated above
