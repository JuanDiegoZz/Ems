import assert from "node:assert/strict";
import test from "node:test";
import { clipboardBlobToFile, getImageFromClipboardItems, mimeToExtension, validateImageFile } from "../../src/lib/people/clipboard.ts";

test("clipboard image helpers preserve PNG metadata", () => {
  const blob = new Blob(["png"], { type: "image/png" });
  const file = clipboardBlobToFile(blob, 123);

  assert.equal(file?.name, "clipboard-123.png");
  assert.equal(file?.type, "image/png");
});

test("clipboard image helpers map JPEG to a JPG filename", () => {
  const blob = new Blob(["jpeg"], { type: "image/jpeg" });
  const file = clipboardBlobToFile(blob, 456);

  assert.equal(file?.name, "clipboard-456.jpg");
  assert.equal(file?.type, "image/jpeg");
});

test("clipboard image helpers preserve WEBP metadata", () => {
  const blob = new Blob(["webp"], { type: "image/webp" });
  const file = clipboardBlobToFile(blob, 789);

  assert.equal(file?.name, "clipboard-789.webp");
  assert.equal(file?.type, "image/webp");
});

test("text-only clipboard does not produce an image", () => {
  const result = getImageFromClipboardItems([
    { kind: "string", type: "text/plain", getAsFile: () => null },
  ]);

  assert.equal(result, null);
});

test("clipboard image is preferred when text and image are both present", () => {
  const result = getImageFromClipboardItems([
    { kind: "string", type: "text/plain", getAsFile: () => null },
    { kind: "file", type: "image/webp", getAsFile: () => new Blob(["webp"], { type: "image/webp" }) },
  ], 321);

  assert.equal(result?.name, "clipboard-321.webp");
  assert.equal(result?.type, "image/webp");
});

test("unsupported clipboard images keep their MIME for the existing validator to reject", () => {
  assert.equal(mimeToExtension("image/gif"), "img");
  const file = getImageFromClipboardItems([
    { kind: "file", type: "image/gif", getAsFile: () => new Blob(["gif"], { type: "image/gif" }) },
  ]);
  assert.equal(file?.type, "image/gif");
});

test("PNG, JPEG and WEBP files pass the shared document validator", () => {
  for (const type of ["image/png", "image/jpeg", "image/webp"]) {
    assert.equal(validateImageFile(new File(["image"], "document", { type })), null);
  }
});

test("the shared document validator rejects files above 1.5 MB", () => {
  const file = new File([new Uint8Array(1_572_865)], "large.png", { type: "image/png" });

  assert.equal(validateImageFile(file), "La imagen supera el tamaño máximo permitido de 1.5 MB.");
});
