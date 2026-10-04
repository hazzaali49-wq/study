Study Atlas slide-view update

The original PDF is preserved, and every original page appears in the default
study view. Each page has an original pane and a study pane. Each pane supports
its own zoom, fit and hand controls, trackpad pinch and touchscreen pinch.
Navigation supports previous/next, slide-number entry, chapter jump and arrow keys.
Existing chapter guides, notes and annotation storage are retained. Stored cloud
lectures are upgraded when served; local lectures use the same reader.

New uploads are parsed and stored in the browser. A complete source version opens
without waiting for AI. If Chrome's on-device model is already available, concise
teaching explanations are added in the background. Image input is used when the
local model supports it. Otherwise the original image and readable source text
remain available. The interface distinguishes source notes from AI explanations.
Unreadable images cannot be fully interpreted without a supported vision model.
The Enable button can prepare Chrome's local model; it does not call Netlify AI.

Detailed slides can show a study copy of the original with highlighted text labels
and a numbered explanation. Highlight locations come from actual PDF text boxes;
the AI cannot invent image coordinates. The untouched source remains on the left.

Drawing uses a separate active-stroke layer and paints new segments once per
animation frame. History is replayed only for restoration, resize or undo. Canvas
buffers are allocated near the viewport, and remote slide bitmaps are released.
Notes and pins use stable lecture IDs and support jumping back to a slide.

The browser and Netlify functions share public/course-catalog.js. A module code
constrains the module but supplies no lecture title score. Abbreviations, titles
and aliases choose the lecture; ambiguous matches require editing. Lecture numbers
come from the catalogue, not calendar ordering. Previously wrong metadata can be
repaired from the original filename while preserving lecture identity.

Paid AI remains gated by STUDY_ATLAS_ALLOW_PAID_AI, disabled by default. Normal
uploads and tutor questions run locally and do not call Netlify Functions or Blobs.
Existing cloud lectures still use their existing delivery routes. This change does
not eliminate ordinary website hosting or bandwidth usage.

Verification: npm test; npm run check. These cover matching, source retention,
manual identity, rebuild identity, streaming, cancellation, timeouts, local-only
chat interception, script escaping and drawing cost with a large saved history.

## Reader regression repairs

- Hide panels closes open tools/notes/board/AI panels, hides reader navigation, and notifies the library iframe shell. The dock stays available; Show panels or Escape restores navigation.
- Read legacy answer keys and flashcards directly from the original lecture data. Preserve rich cheat-sheet paragraphs, lists and tables. Place questions at their referenced slides and provide direct navigation to final understanding, detailed revision, flashcards and complete chapter guides.
- Source recall, full revision points and takeaways are included for local uploads. On-device enrichment adds slide questions and revision content, resumes old local lectures, and continues after a failed batch. Existing cloud lectures use the shared adapter without needing a cloud rebuild.
- The study pane never adds a plain duplicate bitmap. It produces caption label keys, explicit source relationship schematics, and mechanism chains. Located labels receive numbered spotlights on a cropped source detail. Raster label OCR runs in one browser worker using pinned Tesseract.js 6.0.1; it downloads runtime/language assets from public CDNs and does not send lecture images to a service. Only confident exact label matches are highlighted. Unreadable labels retain their source key without invented positions.
- Library cards reconcile across bundled, cloud and local lectures using module + known lecture number. Latest uploads lead; alternative sources, study guides and note buttons remain in an expandable versions section. Completion migrates to a stable identity and each lecture counts once. Unknown lecture numbers remain separate.
- Paid AI remains disabled. Local uploads and enhancements do not invoke Netlify AI/upload functions.

Validation includes DOM regressions for both original lectures, interactive question feedback and panel toggling, cross-source library reconciliation, visual evidence matching, builder enrichment/failure recovery, existing AI/ink/calendar checks and syntax checks. Live browser layout validation remains blocked by the site's Netlify team-protection screen and the preview URL policy.


## Notebook and navigation repair (4 October)

- Add Menu to the sticky slide navigation and a persistent Menu button to the tool dock, including focus mode. Return from an embedded lecture through the parent shell; standalone readers link back to the correct module. Source-note links reopen the exact original slide using a slide query parameter.
- Use one notebook for every lecture card, every module, the lecture notes panel, and the saved-notes section after revision. Notes from alternate versions appear together while preserving the source lecture ID and original slide number. Search notes or switch to pinned slides in the full notebook.
- Store note/pin metadata and full-slide images separately in a browser IndexedDB database. Save a bounded, complete original PDF page with each new typed/sketched note and each pin. Freeze the selected slide when the draft opens. Failed captures or saves preserve the draft and report the failure.
- Import old generated notes/pins and hand-built quick notes without deleting their old keys. Import original figure/deck/text pins when their source lecture opens. Backfill older note snapshots lazily and retain sketches even if the original PDF is unavailable. Deletion tombstones prevent migrations or a late background capture from reviving a removed note.
- Move Pin slide beside the original slide, save a durable image rather than an ephemeral blob URL, show the board immediately, and synchronize pin state/counts. Notes, drawing tools, board and AI share predictable close behavior; panels scroll within the viewport with larger close/save controls and reduced-motion support.
- All new note/pin storage, snapshots and searches stay on the device. Paid AI remains disabled. Existing cloud PDF delivery still follows the original hosting routes.

Validation: 40 regression tests, including real IndexedDB semantics via fake-indexeddb, cross-page persistence, legacy migration, full-slide capture, quota/capture failures, pin toggling, lecture/module notebook entry points, menu controls and exact-slide return links. Syntax checks cover 62 browser and Netlify scripts. Live browser layout validation remains limited by the Netlify protection and preview policy described above.
