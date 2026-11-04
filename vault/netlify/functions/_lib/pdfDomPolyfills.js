// pdf-parse (via pdfjs-dist) touches a handful of browser-only globals —
// DOMMatrix, ImageData, Path2D — during PDF parsing, not just for actual
// image rendering we never do. Confirmed by reading pdfjs-dist's own
// worker source (pdf.worker.mjs): image mask decoding calls
// `new DOMMatrix().scaleSelf(...).translateSelf(...)` unconditionally,
// which crashes the whole function with "ReferenceError: DOMMatrix is
// not defined" in a plain Node/serverless runtime.
//
// pdfjs-dist's own fix for this is an optional native dependency
// (@napi-rs/canvas, a compiled binary) — but getting a compiled binary to
// survive Netlify Functions' JS bundler turned out to be unreliable in
// practice (tried marking it external in netlify.toml; the function still
// crashed the same way after deploy). Since this app only ever extracts
// plain text — never renders or returns image pixels — correctness of the
// matrix math and canvas output doesn't matter here, only that calling
// these APIs doesn't throw. A small pure-JS stand-in sidesteps the whole
// native-binary-bundling problem: it's plain code, so it bundles exactly
// like every other file in this project.
//
// Imported for its side effect only — must be imported before anything
// that pulls in pdf-parse/pdfjs-dist, so these globals exist before that
// code ever runs. ES module imports evaluate in order, so importing this
// first in pdfText.js is sufficient.

class DOMMatrixPolyfill {
  constructor(init) {
    this.a = 1;
    this.b = 0;
    this.c = 0;
    this.d = 1;
    this.e = 0;
    this.f = 0;
    if (Array.isArray(init) && init.length >= 6) {
      [this.a, this.b, this.c, this.d, this.e, this.f] = init;
    }
  }

  scaleSelf(sx = 1, sy = sx) {
    this.a *= sx;
    this.b *= sx;
    this.c *= sy;
    this.d *= sy;
    return this;
  }

  translateSelf(tx = 0, ty = 0) {
    this.e += this.a * tx + this.c * ty;
    this.f += this.b * tx + this.d * ty;
    return this;
  }

  multiplySelf(other) {
    const { a, b, c, d, e, f } = this;
    this.a = a * other.a + c * other.b;
    this.b = b * other.a + d * other.b;
    this.c = a * other.c + c * other.d;
    this.d = b * other.c + d * other.d;
    this.e = a * other.e + c * other.f + e;
    this.f = b * other.e + d * other.f + f;
    return this;
  }

  invertSelf() {
    const det = this.a * this.d - this.b * this.c;
    if (!det) return this;
    const { a, b, c, d, e, f } = this;
    this.a = d / det;
    this.b = -b / det;
    this.c = -c / det;
    this.d = a / det;
    this.e = (c * f - d * e) / det;
    this.f = (b * e - a * f) / det;
    return this;
  }

  transformPoint(point) {
    return {
      x: this.a * point.x + this.c * point.y + this.e,
      y: this.b * point.x + this.d * point.y + this.f,
    };
  }
}

class ImageDataPolyfill {
  constructor(dataOrWidth, widthOrHeight, maybeHeight) {
    if (dataOrWidth instanceof Uint8ClampedArray) {
      this.data = dataOrWidth;
      this.width = widthOrHeight;
      this.height = maybeHeight;
    } else {
      this.width = dataOrWidth;
      this.height = widthOrHeight;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    }
  }
}

class Path2DPolyfill {
  moveTo() {}
  lineTo() {}
  closePath() {}
  rect() {}
  arc() {}
  arcTo() {}
  bezierCurveTo() {}
  quadraticCurveTo() {}
  ellipse() {}
  addPath() {}
}

if (typeof globalThis.DOMMatrix === "undefined") globalThis.DOMMatrix = DOMMatrixPolyfill;
if (typeof globalThis.ImageData === "undefined") globalThis.ImageData = ImageDataPolyfill;
if (typeof globalThis.Path2D === "undefined") globalThis.Path2D = Path2DPolyfill;

// Temporary diagnostic — confirmed locally (with the native @napi-rs/canvas
// binary deliberately removed, reproducing the exact production failure)
// that this polyfill does prevent the crash. The same code still crashed
// after deploying to Netlify, so this logs proof of whether the polyfill
// actually ran and which DOMMatrix ends up winning, to find out whether
// the problem is bundling/ordering rather than the polyfill logic itself.
// Remove once the real cause is confirmed and fixed.
// eslint-disable-next-line no-console
console.log(
  "[pdfDomPolyfills] loaded — globalThis.DOMMatrix is now:",
  globalThis.DOMMatrix?.name || typeof globalThis.DOMMatrix,
);
