import type { ProjectDocumentation } from '../docs'

export const deskConvertDocs: ProjectDocumentation = {
  slug: 'deskconvert',
  updatedLabel: 'RELEASE v2.0.0',
  pages: [
    {
      id: 'introduction',
      label: 'Architecture & Matrix',
      group: 'Getting Started',
      categoryLabel: 'GETTING STARTED',
      readTime: '7 MIN READ',
      title: 'DeskConvert',
      subtitle: 'Dual-Platform Web WASM & Native Desktop Architecture (v2.0)',
      lead: 'DeskConvert is a privacy-first local PDF and image conversion studio that runs identically in the browser on Vercel using WebAssembly and on Windows as a standalone WebView2 desktop application.',
      sections: [
        {
          id: 'why-dual-target',
          title: 'Why DeskConvert uses a dual-runtime split',
          blocks: [
            {
              type: 'callout',
              variant: 'note',
              title: 'LIVE WEB STUDIO',
              text: 'Use DeskConvert directly in your browser (zero server uploads, 100% WASM) at https://desk-convert.vercel.app/.',
            },
            {
              type: 'paragraph',
              text: 'Traditional online file converters upload sensitive documents to remote servers, while serverless functions on platforms like Vercel cap request payloads at ~4.5 MB and lack native C/C++ binaries like Poppler and Tesseract. DeskConvert solves both problems by pairing one shared React 19 + TypeScript studio UI with two local execution engines:',
            },
            {
              type: 'principles',
              items: [
                {
                  num: '01',
                  title: 'Web Engine (100% Browser WASM)',
                  body: 'Executes in browser RAM via pdf-lib, pdfjs-dist, HTML5 Canvas, jszip, and tesseract.js. Zero network uploads.',
                },
                {
                  num: '02',
                  title: 'Desktop Engine (pywebview + Python)',
                  body: 'Wraps the exact same React UI in Edge WebView2 backed by PyMuPDF (fitz), Pillow, Tesseract OCR, and Poppler.',
                },
                {
                  num: '03',
                  title: 'Non-Destructive Storyboard',
                  body: 'Files are staged into an isolated OS temp cache and exported with _converted_NN naming so originals are never touched.',
                },
              ],
            },
            {
              type: 'table',
              columns: ['CAPABILITY', 'WEB ENGINE (src/engines/webEngine.ts)', 'DESKTOP ENGINE (core/ + desktop/bridge.py)'],
              rows: [
                ['PDF -> Image', 'pdfjs-dist Canvas rasterizer (72–600 DPI, ZIP bundle)', 'PyMuPDF page.get_pixmap (72–1200 DPI, direct folder output)'],
                ['Image -> PDF', 'pdf-lib DPI-aware point layout with aspect cap', 'PyMuPDF _insert_scaled_image_page with median width normalization'],
                ['Merge & Reorder', 'Mixed PDF page + image StoryboardItem[] assembly', 'PdfEngine.build_working_pdf over ordered (cached_path, page_idx) tuples'],
                ['Split PDF', 'Multi-range Single PDF or ZIP of individual pages', 'PdfEngine.split_pdf in single or individual mode'],
                ['Batch Image Convert', 'Canvas + custom binary BMP & TIFF encoders', 'ImageEngine.batch_convert via Pillow with alpha-to-RGB compositing'],
                ['Smart Compression', 'Canvas quality search + PDF object stream rewrite', 'Binary search JPEG/WebP, PNG quantization ladder, and PDF DPI ladder'],
                ['OCR Studio', 'tesseract.js WebWorker (.txt & searchable PDF)', 'Native Tesseract + Poppler with PyMuPDF 250 DPI fallback'],
                ['Watermark & Metadata', 'Canvas/pdf-lib stamp (OCR excluded) & metadata strip/keep', 'core/watermark.py & core/metadata.py post-processing hooks'],
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'adapter-storyboard',
      label: 'Adapter & Storyboard',
      group: 'Core Concepts',
      categoryLabel: 'CORE CONCEPTS',
      readTime: '8 MIN READ',
      title: 'DeskConvert',
      subtitle: 'EngineAdapter Contract & Storyboard Data Flow',
      lead: 'How src/engines/adapter.ts detects the active runtime, normalizes page ranges, estimates compression targets, and enforces storyboard fidelity.',
      sections: [
        {
          id: 'adapter-contract',
          title: 'Runtime detection & range normalization (src/engines/adapter.ts)',
          blocks: [
            {
              type: 'paragraph',
              text: 'At startup, the UI checks isDesktopBridgeAvailable() to see whether window.pywebview.api has been injected by the Python host. Shared pure helpers in src/engines/adapter.ts handle extension validation, compression heuristics, and 1-based page range clamping:',
            },
            {
              type: 'code',
              language: 'typescript',
              filename: 'src/engines/adapter.ts',
              code: `export const SUPPORTED_PDF_EXT = '.pdf';\nexport const SUPPORTED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif'];\nexport const SUPPORTED_ALL_EXTS = [SUPPORTED_PDF_EXT, ...SUPPORTED_IMAGE_EXTS];\nexport const WATERMARK_TEXT = 'DeskConvert | Made by Muhammad Kamal';\n\nexport function analyzeCompressionTarget(\n  currentBytes: number,\n  targetBytes: number\n): CompressionEstimate | null {\n  if (currentBytes <= 0 || targetBytes <= 0 || targetBytes >= currentBytes * 0.905) {\n    return null;\n  }\n  const reductionPercent = Math.round(((currentBytes - targetBytes) / currentBytes) * 100);\n  const suggestedQuality = Math.max(10, Math.min(92, 100 - reductionPercent));\n  const estimatedBytes = Math.max(1024, Math.round(currentBytes * (suggestedQuality / 100)));\n  return { currentBytes, targetBytes, suggestedQuality, reductionPercent, estimatedBytes };\n}\n\nexport function expandRangesToZeroBasedIndices(ranges: PageRange[], totalPages: number): number[] {\n  const clamped = normalizePageRanges(ranges, totalPages);\n  const result: number[] = [];\n  const seen = new Set<number>();\n  for (const [start, end] of clamped) {\n    for (let p = start; p <= end; p++) {\n      const idx = p - 1;\n      if (!seen.has(idx)) {\n        seen.add(idx);\n        result.push(idx);\n      }\n    }\n  }\n  return result;\n}\n\nexport function isDesktopBridgeAvailable(): boolean {\n  return typeof window !== 'undefined' && Boolean((window as unknown as { pywebview?: { api?: unknown } }).pywebview?.api);\n}`,
            },
          ],
        },
        {
          id: 'storyboard-pipeline',
          title: '5-stage storyboard fidelity pipeline',
          blocks: [
            {
              type: 'list',
              items: [
                {
                  title: '1. Ingest & Password Guard',
                  detail: 'Validates file extensions against SUPPORTED_ALL_EXTS and rejects encrypted PDFs upfront so downstream tools never crash mid-batch.',
                },
                {
                  title: '2. Discrete Storyboard Expansion',
                  detail: 'Multi-page PDFs are expanded into individual StoryboardItem cards (id, sourceId, fileName, kind, pageIndex, thumbnailUrl, selected) alongside standalone image cards.',
                },
                {
                  title: '3. Undoable Canvas Mutations',
                  detail: 'Dragging cards to reorder or deleting single pages mutates the active StoryboardItem[] array while pushing previous snapshots onto an undo stack.',
                },
                {
                  title: '4. Materialized Working PDF',
                  detail: 'Before running Split, Compress, or OCR on a modified storyboard, the engine materializes the current ordered (sourceId, pageIndex) sequence into a temporary working PDF so deletions and reorders are honored.',
                },
                {
                  title: '5. Post-Processing & Safe Delivery',
                  detail: 'Applies watermark stamping (automatically skipped for OCR outputs to preserve character recognition) and metadata keep/strip before saving.',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'web-engine',
      label: 'Browser WASM Engine',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '9 MIN READ',
      title: 'DeskConvert',
      subtitle: 'Client-Side PDF Rendering & Binary BMP/TIFF Encoders',
      lead: 'Deep dive into src/engines/webEngine.ts: how DeskConvert rasterizes PDFs at custom DPI and encodes raw RGBA pixel buffers into valid BMP and TIFF binaries in TypeScript.',
      sections: [
        {
          id: 'pdfjs-canvas',
          title: 'DPI-scaled PDF rasterization (renderPdfPageToCanvas)',
          blocks: [
            {
              type: 'paragraph',
              text: 'Standard PDF points are defined at 72 DPI. To export high-resolution images (up to 600 DPI in the browser), renderPdfPageToCanvas() computes scale = dpi / 72, creates an offscreen HTMLCanvasElement matching the scaled viewport, fills a white background to prevent transparent PNG artifacts, and awaits page.render():',
            },
            {
              type: 'code',
              language: 'typescript',
              filename: 'src/engines/webEngine.ts',
              code: `async function renderPdfPageToCanvas(\n  pdfBytes: Uint8Array,\n  pageIndex: number,\n  dpi: number\n): Promise<HTMLCanvasElement> {\n  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice() });\n  const pdf = await loadingTask.promise;\n  try {\n    const safePage = Math.max(1, Math.min(pageIndex + 1, pdf.numPages));\n    const page = await pdf.getPage(safePage);\n    const scale = dpi / 72;\n    const viewport = page.getViewport({ scale });\n    const canvas = document.createElement('canvas');\n    canvas.width = Math.max(1, Math.round(viewport.width));\n    canvas.height = Math.max(1, Math.round(viewport.height));\n    const ctx = canvas.getContext('2d');\n    if (!ctx) throw new Error('Canvas 2D context unavailable.');\n    ctx.fillStyle = '#ffffff';\n    ctx.fillRect(0, 0, canvas.width, canvas.height);\n    await page.render({ canvasContext: ctx, viewport }).promise;\n    return canvas;\n  } finally {\n    await pdf.destroy();\n  }\n}`,
            },
          ],
        },
        {
          id: 'binary-encoders',
          title: 'Custom binary BMP & TIFF encoders in TypeScript',
          blocks: [
            {
              type: 'paragraph',
              text: 'HTMLCanvasElement.toBlob() natively supports only image/png, image/jpeg, and image/webp. To support full 5-format batch conversion (JPG, PNG, WebP, BMP, TIFF) offline in the browser, src/engines/webEngine.ts implements binary ArrayBuffer encoders for 24-bit Windows BMP and baseline uncompressed RGB TIFF:',
            },
            {
              type: 'code',
              language: 'typescript',
              filename: 'src/engines/webEngine.ts (encodeCanvasToBmp)',
              code: `function encodeCanvasToBmp(canvas: HTMLCanvasElement): Blob {\n  const ctx = canvas.getContext('2d')!;\n  const { width, height } = canvas;\n  const { data } = ctx.getImageData(0, 0, width, height);\n  const rowSize = Math.floor((24 * width + 31) / 32) * 4; // 4-byte aligned scanlines\n  const pixelBytes = rowSize * height;\n  const buf = new ArrayBuffer(54 + pixelBytes);\n  const view = new DataView(buf);\n\n  view.setUint16(0, 0x4d42, true); // 'BM' magic header\n  view.setUint32(2, 54 + pixelBytes, true);\n  view.setUint32(10, 54, true);    // Pixel data offset\n  view.setUint32(14, 40, true);    // BITMAPINFOHEADER size\n  view.setInt32(18, width, true);\n  view.setInt32(22, height, true); // Bottom-up scanline order\n  view.setUint16(26, 1, true);     // Color planes\n  view.setUint16(28, 24, true);    // 24 bits per pixel (BGR)\n  view.setUint32(34, pixelBytes, true);\n\n  const bytes = new Uint8Array(buf);\n  for (let y = 0; y < height; y++) {\n    const srcRow = (height - 1 - y) * width * 4;\n    const dstRow = 54 + y * rowSize;\n    for (let x = 0; x < width; x++) {\n      const s = srcRow + x * 4;\n      const d = dstRow + x * 3;\n      bytes[d] = data[s + 2];     // Blue\n      bytes[d + 1] = data[s + 1]; // Green\n      bytes[d + 2] = data[s];     // Red\n    }\n  }\n  return new Blob([buf], { type: 'image/bmp' });\n}`,
            },
          ],
        },
      ],
    },
    {
      id: 'desktop-bridge-engines',
      label: 'Desktop Bridge & PDF Core',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '10 MIN READ',
      title: 'DeskConvert',
      subtitle: 'PyWebView Bridge, CacheManager & PyMuPDF Engine',
      lead: 'Inside desktop/bridge.py, core/cache_manager.py, core/pdf_engine.py, and core/export.py: staging files safely and assembling mixed storyboards.',
      sections: [
        {
          id: 'cache-and-bridge',
          title: 'Isolated temp staging (CacheManager & DeskConvertBridge)',
          blocks: [
            {
              type: 'paragraph',
              text: 'When a user selects files or drops a folder in the Windows desktop app, DeskConvertBridge.stage_paths() walks directories recursively, checks Validators.is_supported_file() and Validators.is_password_protected(), copies every valid file into an isolated tempfile.mkdtemp(prefix="deskconvert_") directory via CacheManager.stage_file(), and generates base64 PNG thumbnails:',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'core/cache_manager.py',
              code: `class CacheManager:\n    """Stages source files into an isolated OS temp dir and renders thumbnails/previews."""\n\n    def __init__(self):\n        self.temp_dir = tempfile.mkdtemp(prefix="deskconvert_")\n        self.file_map: Dict[str, str] = {}\n        atexit.register(self.clear_cache)\n\n    def stage_file(self, source_filepath: str) -> str:\n        if source_filepath in self.file_map and os.path.exists(self.file_map[source_filepath]):\n            return self.file_map[source_filepath]\n\n        filename = os.path.basename(source_filepath)\n        base, ext = os.path.splitext(filename)\n        cached_path = os.path.join(self.temp_dir, f"{base}_{uuid.uuid4().hex[:8]}{ext}")\n        shutil.copy2(source_filepath, cached_path)\n        self.file_map[source_filepath] = cached_path\n        return cached_path`,
            },
          ],
        },
        {
          id: 'pdf-engine-internals',
          title: 'Mixed PDF + image storyboard assembly (core/pdf_engine.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'PdfEngine.build_working_pdf() takes an ordered list of (cached_path, zero_based_page_idx) tuples representing the live storyboard. It computes the median point width across any included images (capped at A4/Letter 841.89 pt), caps extreme vertical aspect ratios at 2.0x width (centering tall screenshots with proportional scaling), and merges selected PDF pages and images into a single document:',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'core/pdf_engine.py',
              code: `def _read_image_pt_dims(image_path: str) -> Tuple[float, float]:\n    with PilImage.open(image_path) as img:\n        img_w, img_h = img.size\n        dpi_info = img.info.get("dpi", (96, 96))\n        dpi_x = float(dpi_info[0]) if dpi_info and dpi_info[0] > 0 else 96.0\n        dpi_y = float(dpi_info[1]) if dpi_info and len(dpi_info) > 1 and dpi_info[1] > 0 else dpi_x\n    return (img_w / dpi_x) * 72.0, (img_h / dpi_y) * 72.0\n\n@staticmethod\ndef build_working_pdf(ordered_items: List[Tuple[str, int]], output_path: str) -> str:\n    image_paths = [p for p, _ in ordered_items if os.path.splitext(p)[1].lower() in IMAGE_EXTS]\n    ref_w = 841.89\n    if image_paths:\n        widths = [_read_image_pt_dims(p)[0] for p in image_paths]\n        ref_w = min(statistics.median(widths), 841.89)\n\n    out_doc = fitz.open()\n    open_pdfs = {}\n    try:\n        for file_path, page_idx in ordered_items:\n            ext = os.path.splitext(file_path)[1].lower()\n            if ext == ".pdf":\n                src = open_pdfs.setdefault(file_path, fitz.open(file_path))\n                if 0 <= page_idx < len(src):\n                    out_doc.insert_pdf(src, from_page=page_idx, to_page=page_idx)\n            elif ext in IMAGE_EXTS:\n                _insert_scaled_image_page(out_doc, file_path, ref_w)\n        out_doc.save(output_path)\n    finally:\n        out_doc.close()\n        for src in open_pdfs.values():\n            src.close()\n    return output_path`,
            },
          ],
        },
        {
          id: 'safe-export-naming',
          title: 'Collision-proof file naming (core/export.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'ExportEngine.safe_output_path() and batch_output_paths() guarantee that neither source files nor previously exported outputs are ever overwritten on disk, incrementing _converted_01, _converted_02 suffixes and tracking in-flight batch paths:',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'core/export.py',
              code: `@staticmethod\ndef safe_output_path(directory: str, stem: str, extension: str) -> str:\n    if not extension.startswith('.'):\n        extension = f".{extension}"\n    counter = 1\n    while True:\n        filename = f"{stem}_converted_{counter:02d}{extension}"\n        full_path = os.path.join(directory, filename)\n        if not os.path.exists(full_path):\n            return full_path\n        counter += 1`,
            },
          ],
        },
      ],
    },
    {
      id: 'compression-and-ocr',
      label: 'Compression & OCR Core',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '9 MIN READ',
      title: 'DeskConvert',
      subtitle: 'Target-Size Compression Algorithms & Resilient OCR',
      lead: 'Walkthrough of core/compression.py and core/ocr_engine.py: binary-search quality targeting, multi-step PDF downsampling ladders, and Poppler-optional OCR.',
      sections: [
        {
          id: 'compression-algorithms',
          title: 'Target-byte image & PDF compression (core/compression.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'Instead of offering a vague "low / medium / high" slider, CompressionEngine accepts an exact target_bytes budget and uses format-specific optimization strategies:',
            },
            {
              type: 'list',
              items: [
                {
                  title: 'JPEG & WebP — Binary Search Over Quality [5..95]',
                  detail: 'Runs a binary search in memory (io.BytesIO) over quality in [5, 95] with optimize=True, selecting the highest quality setting whose encoded size fits within target_bytes.',
                },
                {
                  title: 'PNG — Palette Quantization + LANCZOS Scale Ladder',
                  detail: 'Tries lossless optimize=True first, then quantizes colors (256 -> 128 -> 64). If still over budget, progressively scales dimensions (0.85 -> 0.70 -> 0.55 -> 0.40) with Image.Resampling.LANCZOS.',
                },
                {
                  title: 'PDF — Lossless Garbage Collection + Adaptive (DPI, Quality) Ladder',
                  detail: 'First saves with fitz garbage=4, deflate=True, clean=True. If still above target_bytes, iterates through [(150, 78), (120, 68), (96, 55), (72, 45), (72, 30)] until the re-encoded PDF meets the target budget.',
                },
              ],
            },
            {
              type: 'code',
              language: 'python',
              filename: 'core/compression.py (compress_pdf ladder)',
              code: `with fitz.open(cached_source_path) as doc:\n    doc.save(output_path, garbage=4, deflate=True, clean=True)\n\nif os.path.getsize(output_path) > target_bytes:\n    attempts = [(150, 78), (120, 68), (96, 55), (72, 45), (72, 30)]\n    with fitz.open(cached_source_path) as src_doc:\n        for dpi, quality in attempts:\n            with fitz.open() as re_doc:\n                for page in src_doc:\n                    pix = page.get_pixmap(dpi=dpi, alpha=False)\n                    pil_img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)\n                    jpg_buf = io.BytesIO()\n                    pil_img.save(jpg_buf, format="JPEG", quality=quality, optimize=True)\n                    new_page = re_doc.new_page(width=page.rect.width, height=page.rect.height)\n                    new_page.insert_image(page.rect, stream=jpg_buf.getvalue())`,
            },
          ],
        },
        {
          id: 'ocr-fallback',
          title: 'Binary auto-discovery & Poppler fallback (core/ocr_engine.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'OcrEngine auto-discovers Tesseract and Poppler across PATH, bundled PyInstaller sys.executable directories, and standard Windows Program Files paths. If pdf2image fails because Poppler is not installed on a developer machine, _load_pages_as_images() automatically falls back to PyMuPDF 250 DPI page rasterization so OCR continues uninterrupted:',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'core/ocr_engine.py',
              code: `@staticmethod\ndef _load_pages_as_images(cached_path: str) -> List[Image.Image]:\n    ext = os.path.splitext(cached_path)[1].lower()\n    if ext in IMAGE_EXTS:\n        return [Image.open(cached_path).convert("RGB")]\n\n    poppler_path = _discover_poppler()\n    try:\n        kwargs = {"poppler_path": poppler_path} if poppler_path else {}\n        return convert_from_path(cached_path, **kwargs)\n    except Exception as e:\n        msg = str(e).lower()\n        if "poppler" in msg or "not installed" in msg or "unable to get page count" in msg:\n            images: List[Image.Image] = []\n            with fitz.open(cached_path) as doc:\n                for page in doc:\n                    pix = page.get_pixmap(dpi=250, alpha=False)\n                    images.append(Image.frombytes("RGB", (pix.width, pix.height), pix.samples))\n            return images\n        raise`,
            },
          ],
        },
      ],
    },
    {
      id: 'build-and-packaging',
      label: 'Build, Tests & Installer',
      group: 'Reference',
      categoryLabel: 'REFERENCE',
      readTime: '6 MIN READ',
      title: 'DeskConvert',
      subtitle: 'Local Build, Test Suites & Inno Setup Packaging',
      lead: 'Reference commands for building the Vercel web bundle (dist_web/), running Vitest and Pytest suites, and compiling DeskConvert_Setup.exe.',
      badge: 'v2.0',
      sections: [
        {
          id: 'build-matrix',
          title: 'Development, test & installer commands',
          blocks: [
            {
              type: 'code',
              language: 'powershell',
              filename: 'Web & Desktop Build Commands',
              code: `# 1. Web Studio (Vercel target -> outputs to dist_web/)\nnpm install\nnpm run typecheck      # tsc --noEmit\nnpm run test           # vitest run\nnpm run build          # tsc --noEmit && vite build\n\n# 2. Windows Native Desktop Studio\npython -m pip install -r requirements.txt\npython main.py         # Launches pywebview Edge WebView2 shell\npython -m pytest tests/test_core.py -v\n\n# 3. Compile Standalone Windows Installer (.exe)\nnpm run build\npyinstaller DeskConvert.spec --noconfirm\niscc DeskConvert.iss   # -> installer_output/DeskConvert_Setup.exe`,
            },
            {
              type: 'table',
              columns: ['ARTIFACT / FILE', 'LOCATION', 'PURPOSE'],
              rows: [
                ['Web Production Bundle', 'dist_web/', 'Static Vite output deployed by Vercel via vercel.json (isolated from PyInstaller dist/)'],
                ['PyInstaller Spec', 'DeskConvert.spec', 'Packages Python interpreter, pywebview, PyMuPDF, Pillow, and dist_web/ assets'],
                ['Inno Setup Script', 'DeskConvert.iss', 'Bundles PyInstaller output + Poppler + Tesseract into installer_output/DeskConvert_Setup.exe'],
                ['User Settings & History', '%APPDATA%/DeskConvert/', 'Persists default output folder, watermark/metadata preferences, and 10-item recent file history'],
              ],
            },
          ],
        },
      ],
    },
  ],
}
