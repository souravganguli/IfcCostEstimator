# IFC Test Fixtures

The [box fixture](../tests/fixtures/box.ifc) was authored for this project: a minimal IFC4 rectangular extrusion, four metres wide, one metre deep, and three metres tall, using metre units. It contains no customer or third-party model data. Tests derive translated variants by changing its local placement.

This fixture verifies a narrow geometry path only. It is not evidence of comprehensive IFC4, IFC2x3, IFC4x3, georeferencing, or large-model compatibility. Additional representative fixtures and measured limits are required before publishing those support claims.

## User-Supplied Duplex Models

The Git-ignored `tests/fixtures/duplex/` folder contains the three IFC2x3 files explicitly supplied and requested for local tests by the user on 2026-10-27: architecture, MEP, and electrical. They were copied unchanged from Downloads and verified using SHA-256 comparisons. The Downloads originals remain unchanged. These supplied files are local test inputs only: do not commit, publish, or include them in deployment artifacts.

These are user-supplied test inputs, not project-authored fixtures. Redistribution rights and original licensing have not been independently established. No source or license is inferred from filenames or exporter metadata. Only the synthetic box is intended to accompany a repository checkout. Browser tests explicitly skip the Duplex group when any supplied file is absent; such skips must not be reported as successful real-model qualification.

The Duplex browser tests use the real local files and disable screenshot, video, and trace artifacts. Canvas comparisons are performed in memory. Models are not served as application assets, uploaded to external services, or included in the production bundle.