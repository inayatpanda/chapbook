# Chapbook public-release checklist

## Engineering gate

- [x] Mandatory clickwrap before activation/app use
- [x] Separate Terms acceptance and Privacy/AI acknowledgement
- [x] Public/in-app Legal Centre with eight versioned documents
- [x] Partner AI notice before first interaction
- [x] Browser Live dictation and local Whisper correctly distinguished
- [x] Full `npm run check`: build + 1,073 tests + clean grep gate on 8 August 2026
- [ ] Manual keyboard/screen-reader/zoom test on consent, activation, Partner and publish
- [ ] Fresh-profile activation, trial and checkout tests
- [ ] Real GitHub create/connect/publish/update/delete smoke with least-privilege account
- [ ] Provider-by-provider AI provenance/export test
- [ ] Signed/notarised macOS and Windows installation smoke

## Legal/operations gate

- [ ] Add verified company number and registered/service address
- [ ] Counsel sign-off on consumer subscription/refund/privacy/AI Act text
- [ ] ICO fee/registration assessment recorded
- [ ] EU representative assessment recorded
- [ ] Netlify/Stripe/GitHub/email DPA and transfer records filed
- [ ] Trial/licence/support retention schedule implemented
- [ ] Rights and incident owner assigned to `support@rqai.co.uk`
- [ ] Checkout and renewal emails match Terms and cancellation rights

## Release evidence

- [ ] Bump desktop/app release version and changelog
- [ ] Commit intended chat/drawing changes with legal release work
- [ ] Push release candidate and create signed tag
- [ ] Draft Netlify deploy and run behavioural release gate
- [ ] Promote production only after preview passes
- [ ] Live `/legal`, `/privacy`, `/terms`, `/ai`, `/storage`, `/acceptable`, `/accessibility`, `/refunds` return 200
- [ ] Fresh-profile clickwrap and material-update re-consent pass live
- [ ] Desktop release assets checksummed/staged and rollback version recorded
