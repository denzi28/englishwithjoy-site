# English with Joy

Source of the English with Joy site (Vercel project `englishwithjoy`).

`build.mjs` runs on Vercel: it downloads the pages that are live now, turns the few Turkish messages into English, checks that School Race is unchanged, then adds everything in `overlay/` (the new home page and the Can's Birthday story game). The result goes to `dist/`.
