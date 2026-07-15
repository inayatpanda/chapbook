// Pure placement rule for the quick-capture camera's "Include in a post" path.
// Mirrors the inline logic in the Studio (public/studio/index.html → camAfterBlock):
// when a captured photo is dropped into the open draft as an Image block, it goes
// AFTER the currently-selected block (so it lands where the writer is working), or
// at the END of the post when nothing is selected. Extracted so the rule is
// unit-tested independently of the DOM.
//
// Returns the block object to insert AFTER (the caller passes it to
// bulkAddImageBlocks, which inserts at that block's index + 1), or null to append.

/* blocks: doc.blocks (array of { id, ... }); selBlockId: the selected block id
   (string) or null/undefined. */
export function afterBlockFor(blocks, selBlockId) {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;
  if (typeof selBlockId !== 'string' || !selBlockId) return blocks[blocks.length - 1];
  const found = blocks.find((b) => b && b.id === selBlockId);
  return found || blocks[blocks.length - 1];
}
