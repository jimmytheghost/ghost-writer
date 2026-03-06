# Release Owner Readiness Checklist

Use this before running a production tag release.

## Ownership and access

- [ ] Primary release owner assigned.
- [ ] Secondary release owner assigned.
- [ ] Both owners have GitHub Actions access.
- [ ] Both owners can approve `production-release` environment runs.

## Environment protections

- [ ] GitHub Environment `production-release` exists.
- [ ] Required reviewers enabled for `production-release`.
- [ ] Tag protection/restrictions enforce approved release flow.

## Required secrets present

All of the following must exist in `production-release` (or equivalent secure scope):

- [ ] `TAURI_SIGNING_PRIVATE_KEY`
- [ ] `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- [ ] `APPLE_CERTIFICATE`
- [ ] `APPLE_CERTIFICATE_PASSWORD`
- [ ] `APPLE_SIGNING_IDENTITY`
- [ ] `APPLE_ID`
- [ ] `APPLE_PASSWORD`
- [ ] `APPLE_TEAM_ID`

## Credential hygiene

- [ ] Apple certificate is valid and not expired.
- [ ] Signing identity matches certificate subject.
- [ ] App-specific Apple password is current.
- [ ] Secret rotation owner is documented.
- [ ] Last secret rotation date is recorded.

## Dry run readiness

- [ ] `main` branch is green.
- [ ] Release notes/changelog updated.
- [ ] Team notified before pushing release tag.

## Sign-off

- Primary owner:
- Secondary owner:
- Date:
- Release tag:
