/* Tests for the vendored GIF encoder (public/studio/vendor/gifenc.esm.js).
   The LZW round-trip test implements a small reference GIF-LZW DECODER and
   checks the encoded pixel indices come back exactly — structure-only checks
   can't catch packing bugs. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeGif } from '../../src/vendor/gifenc.esm.js';

/* tiny synthetic frame: RGBA buffer painted with a function of (x,y) */
function frame(w, h, paint) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b] = paint(x, y);
    const i = (y * w + x) * 4;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
  }
  return d;
}

/* ── minimal reference decoder (enough for our own output) ── */
function decodeFirstFrameIndices(bytes, w, h) {
  assert.equal(String.fromCharCode(...bytes.slice(0, 6)), 'GIF89a');
  const tableBits = (bytes[10] & 7);
  let at = 13 + (1 << (tableBits + 1)) * 3;          // skip header + global table
  // skip extensions until the first image descriptor (0x2C)
  while (bytes[at] === 0x21) {
    at += 2;                                          // introducer + label
    while (bytes[at] !== 0) at += bytes[at] + 1;      // data sub-blocks
    at++;                                             // terminator
  }
  assert.equal(bytes[at], 0x2C, 'image descriptor');
  at += 10;                                           // descriptor (no local table)
  const minCode = bytes[at++];
  // gather the LZW byte stream from sub-blocks
  const data = [];
  while (bytes[at] !== 0) {
    const n = bytes[at++];
    for (let i = 0; i < n; i++) data.push(bytes[at++]);
  }
  // bit reader (LSB first)
  let acc = 0, nbits = 0, pos = 0;
  const CLEAR = 1 << minCode, EOI = CLEAR + 1;
  let codeBits = minCode + 1;
  let dict = [], prev = null;
  const resetDict = () => {
    dict = [];
    for (let i = 0; i < CLEAR; i++) dict[i] = [i];
    dict[CLEAR] = []; dict[EOI] = [];
    codeBits = minCode + 1;
    prev = null;
  };
  resetDict();
  const out = [];
  const read = () => {
    while (nbits < codeBits && pos < data.length) { acc |= data[pos++] << nbits; nbits += 8; }
    const code = acc & ((1 << codeBits) - 1);
    acc >>= codeBits; nbits -= codeBits;
    return code;
  };
  for (;;) {
    const code = read();
    if (code === EOI) break;
    if (code === CLEAR) { resetDict(); continue; }
    let entry;
    if (code < dict.length && dict[code]) entry = dict[code].slice();
    else if (prev) entry = prev.concat(prev[0]);      // the KwKwK case
    else throw new Error('bad code');
    out.push(...entry);
    if (prev){
      dict.push(prev.concat(entry[0]));
      if (dict.length === (1 << codeBits) && codeBits < 12) codeBits++;
    }
    prev = entry;
    if (out.length >= w * h) break;
  }
  return out.slice(0, w * h);
}

test('gif: two-colour flipbook round-trips exactly through LZW', () => {
  const w = 21, h = 13;
  const f0 = frame(w, h, (x) => x < 10 ? [4, 6, 12] : [45, 212, 191]);
  const gif = encodeGif({ width: w, height: h, frames: [{ data: f0, delayMs: 120 }] });
  const idx = decodeFirstFrameIndices(gif, w, h);
  // rebuild the pixels from the palette and compare to the source
  const tableBits = (gif[10] & 7);
  const pal = [];
  for (let i = 0; i < (1 << (tableBits + 1)); i++) pal.push([gif[13 + i * 3], gif[14 + i * 3], gif[15 + i * 3]]);
  for (let p = 0; p < w * h; p++) {
    const [r, g, b] = pal[idx[p]];
    const sx = p % w;
    const want = sx < 10 ? [4, 6, 12] : [45, 212, 191];
    assert.deepEqual([r, g, b], want, `pixel ${p}`);
  }
});

test('gif: structure — header, loop extension, per-frame delays, trailer', () => {
  const w = 8, h = 8;
  const mk = (c) => frame(w, h, () => c);
  const gif = encodeGif({ width: w, height: h, frames: [
    { data: mk([0, 0, 0]), delayMs: 100 },
    { data: mk([255, 255, 255]), delayMs: 250 },
  ] });
  assert.equal(String.fromCharCode(...gif.slice(0, 6)), 'GIF89a');
  const s = [...gif].map(b => String.fromCharCode(b)).join('');
  assert.ok(s.includes('NETSCAPE2.0'), 'looping extension present');
  // two graphics-control extensions with delays 10cs and 25cs
  const delays = [];
  for (let i = 0; i < gif.length - 7; i++) {
    if (gif[i] === 0x21 && gif[i + 1] === 0xF9) delays.push(gif[i + 4] | (gif[i + 5] << 8));
  }
  assert.deepEqual(delays, [10, 25]);
  assert.equal(gif[gif.length - 1], 0x3B, 'trailer');
});

test('gif: >256 colours falls back to a quantised palette that still encodes', () => {
  const w = 32, h = 32;   // 1024 distinct colours
  const f0 = frame(w, h, (x, y) => [x * 8 % 256, y * 8 % 256, (x + y) % 256]);
  const gif = encodeGif({ width: w, height: h, frames: [{ data: f0, delayMs: 100 }] });
  const idx = decodeFirstFrameIndices(gif, w, h);
  assert.equal(idx.length, w * h, 'decodes to the full frame');
  const tableBits = (gif[10] & 7);
  assert.equal(1 << (tableBits + 1), 256, '256-entry global table');
});

test('gif: rejects bad input clearly', () => {
  assert.throws(() => encodeGif({ width: 0, height: 8, frames: [] }), /bad dimensions/);
  assert.throws(() => encodeGif({ width: 8, height: 8, frames: [] }), /no frames/);
  assert.throws(() => encodeGif({ width: 8, height: 8, frames: [{ data: new Uint8Array(3), delayMs: 1 }] }), /size mismatch/);
});
