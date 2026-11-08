#!/usr/bin/env python3
"""Download public property-inspector screenshots for this feature's research."""

from pathlib import Path
from urllib.request import urlretrieve


ASSETS = Path(__file__).resolve().parent
IMAGES = {
    "aps-property-inspector.png": "https://flint-prodcms-forge.s3.amazonaws.com/prod/s3fs-public/inline-images/PropertyInspectorExtension.png",
    "trimble-desktop-objects-panel.png": "https://higherlogicdownload.s3.amazonaws.com/TRIMBLE/UploadedImages/qtEIaJ1qQWOLBvgqyjOS_2025-06-26_12-05-55-L.png",
    "trimble-desktop-object-info.png": "https://higherlogicdownload.s3.amazonaws.com/TRIMBLE/UploadedImages/vX9PQ55FQjqz51c4ungB_2025-06-26_12-03-15-L.png",
}


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    for filename, url in IMAGES.items():
        urlretrieve(url, ASSETS / filename)


if __name__ == "__main__":
    main()
