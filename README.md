# Joy of English

Source of the Joy of English site (Vercel project `englishwithjoy`, joyofenglish.vercel.app).

`build.mjs` runs on Vercel: it downloads the worksheet and game pages that are live now, turns the few Turkish messages into English, checks that School Race is unchanged, adds the recorded voice to the pages that read aloud, then adds everything in `overlay/` (home page, Can's Birthday, the voice files). The result goes to `dist/`.

## Read-aloud
`overlay/shared/voice.js` is loaded first on every page that reads aloud. The pages still call `speechSynthesis`, but every sentence they can say is recorded in `overlay/voice/` (one mp3 per sentence, `index.json` maps the sentence to its file). A sentence with a recording plays the recording, anything else falls back to the browser's voice. New sentences need a new recording, or they are read by the browser.

## Working on the site (Claude, Antigravity or by hand)
1. `git pull` first, so you start from what is live.
2. Change files, then `git commit` and `git push` to `main`. Vercel builds and publishes it.
3. Do not publish with `vercel deploy` from a local folder. That skips GitHub, and the next push from GitHub would undo it (or it undoes the work in GitHub).
