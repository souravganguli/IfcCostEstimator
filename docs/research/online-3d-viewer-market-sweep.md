# Online 3D / IFC Viewer Market Sweep

Research date: 2026-10-30
Status: Desk research complete. Broad sweep of 15+ online 3D model viewers across two segments — BIM/AEC IFC viewers (direct competitors) and general-purpose web 3D viewers (adjacent UX/feature patterns). This is a product-feature benchmark, not a market-size or adoption study. It makes no claims about market share, revenue, or user preference. Vendor claims are marketing-level and unverified against the products unless a source was directly inspected.

This document complements [phase-1-viewer-market-research.md](phase-1-viewer-market-research.md) (which benchmarked Autodesk/Trimble/BIMcollab/APS) by adding the direct browser-viewer peers and whole workflow families that the earlier pass did not cover.

---

## Summary — Features Across Systems, Ranked by Priority

The table lists every capability observed across all surveyed systems, which products implement it, and whether this application has it today. **Priority** is this researcher's recommendation for a browser-only, privacy-first IFC cost estimator, reasoning from: (a) how common the feature is across direct IFC-viewer competitors, (b) how well it fits the product's browser-only / no-upload / settings-only boundaries, and (c) how much it reinforces the product's cost differentiator. Priority is a research recommendation, not an approved commitment; all scope decisions belong in the phase plans.

Legend for "In this app": ✅ implemented · ◑ partial · ❌ absent.

### Priority 1 — Core viewer table-stakes (expected by nearly every competitor)

| Feature | Implemented by | In this app |
| --- | --- | :--: |
| Client-side load, no upload (WASM) | ifcvieweronline, 3dviewer.net, Open IFC Viewer, BIMvision | ✅ |
| Orbit / pan / zoom / fit-to-view | All viewers | ✅ |
| Multi-model federation | ifcvieweronline, OpenProject, BIMcollab, Sortdesk, BIMvision, Trimble | ✅ |
| Element selection + property/pset inspection | ifcvieweronline, OpenProject, Open IFC Viewer, BIMvision, BIMcollab | ✅ |
| Spatial model tree | ifcvieweronline, OpenProject, BIMvision, BIMcollab | ✅ |
| Hide / show / isolate elements | ifcvieweronline, OpenProject, Open IFC Viewer, BIMvision | ◑ |
| Search / filter by attribute or rule | ifcvieweronline, OpenProject, BIMvision, BIMcollab | ✅ |
| Section planes / clipping (any angle) | ifcvieweronline, OpenProject, Open IFC Viewer, BIMvision | ✅ |
| Measurement (length; ideally area/volume/angle, snapping) | ifcvieweronline, Open IFC Viewer, BIMvision | ◑ (length) |
| Orthographic ⇄ perspective, 2D ⇄ 3D, reset/home view | OpenProject, Open IFC Viewer, BIMvision | ◑ |

### Priority 2 — The product's differentiator (cost) and strong-fit extensions

| Feature | Implemented by | In this app |
| --- | --- | :--: |
| Quantity takeoff (IfcElementQuantity aggregation) | ifcvieweronline, BIMvision (takeoff) | ✅ |
| Multi-level takeoff groups | BIMvision | ✅ |
| Cost breakdown structure + element mapping | *(none of the surveyed viewers)* | ✅ |
| Unit rates → costed quantities | *(none of the surveyed viewers)* | ✅ |
| Excel export (ideally with formulas) | BIMvision (takeoff→Excel), Assemble/Vico/CostX (estimating tools) | ✅ |
| By-IFC-class tree tab (alongside spatial tree) | OpenProject, BIMvision | ◑ |
| X-ray / ghost mode | OpenProject, Open IFC Viewer | ◑ |
| Rule-based property coloring | *(limited direct evidence)* | ✅ |
| First-person walkthrough (+ minimap) | OpenProject, Sketchfab (FP), Speckle | ✅ |
| Saved views / viewpoints, BCF 2.1/3.0 | ifcvieweronline, OpenProject, BIMvision, BIMcollab, Open IFC Viewer | ✅ (BCF-aligned) |
| 2D plan / section drawings, DXF export | ifcvieweronline, OpenProject, BIMvision (DXF) | ✅ (drawings) |

### Priority 3 — Common in BIM tools, larger scope or boundary questions

| Feature | Implemented by | In this app |
| --- | --- | :--: |
| Validation + Health Score (rule-based) | ifcvieweronline (44 rules), Open IFC Viewer, Solibri, BIMcollab | ❌ |
| IDS (buildingSMART) checking | ifcvieweronline, Open IFC Viewer, BIMcollab | ❌ |
| Clash detection | Open IFC Viewer, BIMvision, BIMcollab, Solibri | ❌ |
| Model / version compare | BIMvision, Assemble | ❌ |
| Validation report export (JSON/CSV/HTML/BCF) | ifcvieweronline, BIMcollab | ❌ |
| GUID duplicate detection / auto-fix | ifcvieweronline | ❌ |
| Export breadth (glTF / STL / OBJ / COBie) | BIMvision, Sketchfab, model-viewer | ◑ (GLB internal) |

### Priority 4 — Emerging / adjacent / out-of-boundary

| Feature | Implemented by | In this app |
| --- | --- | :--: |
| AI / MCP server (agent reads/edits model) | Open IFC Viewer (ODA MCP) | ❌ |
| Non-destructive editing + IFC re-export | ifcvieweronline, Open IFC Viewer, BIMvision (IFC Edit) | ❌ |
| WebXR AR (app-free) | Sketchfab, Google model-viewer, Vectary, Emersya | ❌ |
| VR headset viewing | Sketchfab | ❌ |
| Georeferenced 3D map mode | ifcvieweronline | ❌ |
| OPFS / geometry caching for fast reloads | ifcvieweronline | ❌ (by policy; see ADR-0005) |
| Post-processing (SSAO / edge / bloom) | ifcvieweronline, Sketchfab, model-viewer | ❌ |
| 3D-PDF publish | Open IFC Viewer | ❌ |
| Product configurators / commerce | Sketchfab, Vectary, Emersya, Threekit | ❌ (out of scope) |
| Annotations / markups / comments / issues | Sketchfab, OpenProject, BIMcollab, Trimble | ◑ (viewpoints) |

> Note: several Priority 4 items (OPFS caching, cloud sharing, accounts, telemetry, configurators) conflict with this application's deliberate boundaries (browser-only, no upload, settings-only storage, no telemetry). They are listed for completeness, not as recommendations.

---

## Segment A — BIM / AEC IFC Viewers (Direct Competitors)

| Product | Category | Hosting / engine | Evidence found | Relevance and limits |
| --- | --- | --- | --- | --- |
| [IFC Viewer Online](https://www.ifcvieweronline.eu/) | Browser IFC viewer + validator | Browser-only, web-ifc (MIT) | 44-rule validator with 0–100 Health Score, buildingSMART IDS checking (all six facets), GUID auto-fix, non-destructive editing with undo/redo + corrected-IFC re-export, quantity takeoff, measurement, floor plans & section cuts, georeferenced 3D map mode, BCF 2.1/3.0, multi-model, OPFS geometry cache, IFC+GLB export, SSAO/edge/bloom, IfcRelationsIndexer. Supports IFC2x3/4/4x1/4x3. Cookieless analytics (PostHog). MIT source. | The closest direct peer: same engine, same privacy pitch, browser-only. Strong evidence; marketing-level. Its OPFS caching conflicts with this app's settings-only storage boundary. |
| [Sortdesk Viewer](https://viewer.sortdesk.com/) | Coordination/review viewer | **Backend** IfcOpenShell + That Open Components | Landing page gated by cookie/terms consent; attribution confirms IfcOpenShell backend processing and That Open 3D viewer. Uses Google Analytics, Sentry, Appzi. | Has a server backend and analytics — opposite of this app's boundaries. Feature detail not extractable without JS; treat as a backend-based peer only. |
| [OpenProject BIM viewer](https://www.openproject.org/docs/bim-guide/ifc-viewer/) | CDE / issue management | Server-hosted, upload, accounts | Documented toolbar: reset view, 2D/3D, orthographic, fit, first-person, slice (section) + clear slices, selection mode, properties/inspect, hide + X-ray mode, show-in-explorer, spatial tree with storey + **Classes** tabs, multi-model hide via checkboxes, BIM issues (BCF). | Detailed end-user control inventory — good UX reference. Requires upload/accounts; not architecturally comparable, but its viewer interactions are. |
| [Open IFC Viewer](https://openifcviewer.com/) (ODA) | Native desktop | ODA SDK (native) | Validation (SDAI / ISO-10303, IDS), measurement with snapping, full 3D (zoom/pan/rotate, visual styles), clash detection + BCF export, selection & property inspection with isolate/hide, section planes, 3D-PDF publish, **built-in MCP server** for AI agents, IFC2x3/4x0/4x2 Bridge/4x3 Rail. 100% local. Windows/macOS/Linux. | Native, not browser — not a like-for-like host, but a rich capability inventory, especially validation, clash, and AI/MCP. |
| [BIMvision](https://bimvision.eu/en/) | Free native viewer + plugins | Native, proprietary | Plugin ecosystem: sections, 2D projections, storey shift, color/transparency, saved views, animation, multifile load, **IFC merge/split**, IFC edit, **clash detection**, geometry/property **compare (revisions)**, object info/search/filter, **takeoff reports → Excel** with multi-level measurement groups, advanced reports with model links, BCF comments, exporters (glTF, COBie, STL, OBJ, X3D, DXF). | Breadth reference for AEC viewer plugins, especially takeoff→Excel (adjacent to this app's cost focus) and clash/compare. Native + plugin model. |
| [BIMcollab Zoom](https://www.bimcollab.com/en/products/bimcollab-zoom/) | Model checking + coordination | Desktop + cloud | Federated model checking, **IDS checking**, smart clash with dedupe (Smart Issues), smart properties (rule-based enrich without editing source), views/lists/insights, BCF/issue integration. ISO 27001, GDPR, data hosted in NL. | Advanced inspection/coordination reference. Cloud-hosted data; model-checking scope beyond a pure viewer. |
| [Solibri](https://www.solibri.com/) | Model checking (paid) | Desktop / enterprise | Rule-based validation organized by "validation authority" tiers (Starter $99/yr visual inspection → Premium $2,772/yr → Security+ air-gapped), federated coordination, IDS compliance, governance. | Enterprise validation benchmark. Paid, desktop; defines the high end of rule-based checking the free browser viewers now imitate. |
| Trimble Connect / APS Viewer *(prior pass)* | CDE / SDK | Cloud / hosted | See [phase-1-viewer-market-research.md](phase-1-viewer-market-research.md): federated viewing, property query, measurement, sections, markups, aggregated views, model comparison. | Cloud/translated-model assumptions differ from local IFC parsing here. |

## Segment B — General-Purpose Web 3D Viewers (Adjacent Patterns)

| Product | Category | Formats | Evidence found | Relevance and limits |
| --- | --- | --- | --- | --- |
| [3dviewer.net](https://3dviewer.net/) | Free open-source web viewer | **IFC**, glTF, STEP, STL, OBJ, 3DS, BIM, DAE, PLY, 3DM, 3MF, AMF, BREP, FBX, FCSTD, IGES, OFF, WRL | Drag-and-drop, Files/Materials/Meshes panels, model display + import settings, edge display. No account. | Closest general-purpose peer that also reads IFC in-browser. Confirms broad client-side format handling is feasible; lightweight UX reference. |
| [three-gltf-viewer](https://gltf-viewer.donmccurdy.com/) | Open-source reference viewer | glTF 2.0 | Drag-drop glTF viewer on three.js (r176). | Technical reference for a minimal three.js viewer; same renderer family as this app. |
| [Google `<model-viewer>`](https://modelviewer.dev/) | Open-source web component | glTF / GLB | Embeddable `<model-viewer>` HTML element, camera-controls, **WebXR AR**, poster images, post-processing addon. Apache-2.0. | Pattern for embeddable/declarative 3D + app-free AR. Not IFC; glTF only. |
| [Sketchfab](https://sketchfab.com/features) | 3D publishing platform | OBJ, FBX, glTF, STL, DAE, IGES, PLY, 3DS, +many (**IFC not core**) | Universal 3D/VR/AR viewer, orbit + first-person + VR teleport, annotations, embed/share, PBR editor, post-processing (SSAO/bloom/DoF/etc.), animations, Viewer API/configurators. Upload 50–500 MB by plan. | UX/feature reference for navigation, annotations, embedding, AR/VR. Upload-based platform; not privacy-aligned. |
| [Vectary](https://www.vectary.com/) | SaaS 3D/AR design | glTF, OBJ, STL, FBX, DAE, STEP, IGES | AI concepting, real-time PBR rendering, materials/post-processing, animations/interactions/configurators, embed/share, app-free Web AR, workspaces, SSO/enterprise. | Configurator/AR/collaboration reference; SaaS with accounts. Out of this app's scope but shows AR/embed expectations. |
| [Emersya](https://www.emersya.com/) / [Threekit](https://threekit.com/) | Commerce 3D/AR & CPQ | various | Product configurators, Web AR commerce, virtual photography, collaborative design (Emersya); AI-native CPQ, configuration/pricing/quote (Threekit). | Commerce/configurator segment — adjacent only; informs that "configurator + pricing" is a distinct market from AEC cost estimating. |

## Cross-Product Workflow Signals

Evidence supports these workflow families; it does not prove each is essential to this product or equally common.

| Workflow family | Evidence signal | This app's status |
| --- | --- | --- |
| Navigation & framing | Universal across all viewers | Implemented (orbit/pan/zoom/fit) |
| First-person walkthrough | OpenProject, Sketchfab, Speckle | Implemented (+ minimap) |
| Orthographic / 2D / view cube / reset | OpenProject, Open IFC Viewer, BIMvision | Partial |
| Selection & property inspection | All IFC viewers | Implemented |
| Model tree (spatial **and by-class**) | OpenProject (Classes tab), BIMvision | Spatial implemented; by-class partial |
| Hide / isolate / **X-ray** | OpenProject (X-ray), Open IFC Viewer, BIMvision | Hide/isolate partial; X-ray absent |
| Search & filter | ifcvieweronline, OpenProject, BIMvision | Implemented |
| Measurement (len/area/vol/angle, snapping) | ifcvieweronline, Open IFC Viewer, BIMvision | Length implemented; others absent |
| Section planes / clipping | All IFC viewers | Implemented |
| 2D plan / section drawings, DXF | ifcvieweronline, OpenProject, BIMvision | Drawings implemented |
| **Quantity takeoff → cost → Excel** | ifcvieweronline (QTO), BIMvision (takeoff→Excel); full cost chain by none | **Implemented — differentiator** |
| **Validation / Health Score / IDS** | ifcvieweronline, Open IFC Viewer, BIMcollab, Solibri | **Absent** |
| **Clash detection** | Open IFC Viewer, BIMvision, BIMcollab, Solibri | Absent |
| Model / version compare | BIMvision, Assemble | Absent |
| Viewpoints / **BCF** | ifcvieweronline, OpenProject, BIMvision, BIMcollab | Implemented (BCF-aligned) |
| Non-destructive edit + re-export | ifcvieweronline, Open IFC Viewer, BIMvision | Absent |
| AI / MCP | Open IFC Viewer (ODA MCP) | Absent |
| AR (WebXR) / VR | Sketchfab, model-viewer, Vectary, Emersya | Absent |
| Georeferenced map | ifcvieweronline | Absent |
| OPFS geometry cache | ifcvieweronline | Absent (by policy) |

## Product and Architecture Implications

- **Validated bets.** Browser-only + web-ifc + no-upload is exactly how `ifcvieweronline.eu` and `3dviewer.net` operate. This independently supports the existing architecture decisions ([ADR-0001](../architecture/adr/0001-browser-only-static-processing.md), [ADR-0003](../architecture/adr/0003-ifc-engine-and-renderer-adapters.md)). The privacy framing ("files never leave your machine, auditable source, usable under NDA") is a marketing narrative this product could adopt.
- **The differentiator is real.** No surveyed viewer offers the full quantity-takeoff → cost-breakdown → unit-rates → Excel chain. `ifcvieweronline` stops at QTO aggregation; BIMvision exports takeoff to Excel but is a native plugin, not a cost estimator. This product's cost workflow is a genuine, defensible differentiator and aligns with [phase-1c-cost-estimation-market-research.md](phase-1c-cost-estimation-market-research.md).
- **The clearest research/coverage gap is validation.** Validation + Health Score + IDS is a headline feature for several direct competitors and was entirely absent from the prior viewer research. It is the strongest candidate to evaluate next for viewer parity, subject to feasibility against the local IFC adapter and the browser-only boundary.
- **Cheap parity wins.** X-ray/ghost mode and a by-IFC-class tree tab are near-universal, low-complexity given the existing hierarchy and visibility features.
- **Boundary-conflicting features.** OPFS caching, cloud sharing/accounts, telemetry, and configurators recur across the market but conflict with this app's deliberate boundaries. They should remain out of scope unless a boundary is deliberately revisited ([ADR-0005](../architecture/adr/0005-settings-only-web-storage.md)).
- **Emerging signal.** AI/MCP integration (Open IFC Viewer) and app-free WebXR AR (model-viewer, Vectary) are rising expectations; MCP is especially notable given this project's own tooling context. Both are Priority 4 candidates, not commitments.

## Evidence Gaps and Follow-up

- Sortdesk, Speckle, and `usebim.com` feature detail could not be extracted (JS-gated / forbidden); treat as unknowns, not absence. Revisit via documentation or product demos.
- Validation/IDS, clash, and non-destructive editing are documented at marketing level; verify technical feasibility against the local `web-ifc` adapter and the Duplex fixtures before any scope proposal.
- No market-size, adoption, or preference claims are made; none should be published without independent sources or direct user research.
- Per the repository media policy, add competitor screenshots/stills for this doc under `docs/research/assets/` with relative references if visual evidence is later captured; none are embedded in this desk pass.
