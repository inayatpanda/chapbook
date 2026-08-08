# Third-party assets

## Icons — Tabler (MIT)

`src/icons-sprite.svg` (5,093 symbols, `#ti-*`) and `src/icons-manifest.json`.
Single-stroke `currentColor` line icons. This is Chapbook's UI icon language: every
toolbar button, the editor chrome, and the 2D/3D post glyphs draw from it, and the glyph
treatment tints them with the post accent colour plus a matching glow — which only works
because they are one colour. Do not replace this set with multicolour artwork.

<https://tabler.io/icons> — MIT.

## Colour glyphs — Twemoji (CC-BY 4.0)

Staged into `dist/emoji/` by `scripts/stage-emoji.mjs` and offered in the glyph picker's
**Colour** mode (`emoji:<slug>` tokens). 1,897 multicolour SVGs.

Copyright 2020 Twitter, Inc and other contributors. Graphics licensed under
**CC-BY 4.0**: <https://creativecommons.org/licenses/by/4.0/>

Attribution is shown in the app, in the glyph picker, whenever Colour mode is active.

Chosen over OpenMoji deliberately: OpenMoji is CC BY-**SA**, and deriving a staged asset
set from it would pull ShareAlike obligations onto a commercial product. CC-BY requires
attribution only.

## Emoji names and grouping — unicode-emoji-json (MIT)

Names, slugs and category groups used to make the colour set searchable.
<https://github.com/muan/unicode-emoji-json> — MIT.

The artwork and the metadata come from different projects on purpose: it keeps the
CC-BY obligation scoped to the images, and the searchable text under MIT.
