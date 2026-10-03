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
