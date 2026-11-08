#!/usr/bin/env python3
"""Capture public selection-demo frames and official APS highlight examples."""

from pathlib import Path
import subprocess
from urllib.request import urlretrieve


ASSETS = Path(__file__).resolve().parent
VIDEO_URL = "https://www.youtube.com/watch?v=x6kIqOpZA-Y"
FRAMES = {
    "00:00:15": "trimble-selection-ready.png",
    "00:00:40": "trimble-object-selected.png",
    "00:01:05": "trimble-selection-updated.png",
    "00:01:30": "trimble-multiple-selection.png",
}
APS_IMAGES = {
    "aps-highlight-before.png": "https://aps.autodesk.com/sites/default/files/inline-images/selection-highlight-before.png",
    "aps-highlight-after.png": "https://aps.autodesk.com/sites/default/files/inline-images/selection-highlight-after.png",
    "aps-highlight-custom.png": "https://aps.autodesk.com/sites/default/files/inline-images/selection-highlight-custom.png",
}


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    for name, url in APS_IMAGES.items():
        urlretrieve(url, ASSETS / name)

    template = ASSETS / "trimble-selection-demo.%(ext)s"
    subprocess.run(
        [
            "yt-dlp",
            "--no-playlist",
            "-f",
            "bv*[ext=mp4][height<=720]+ba[ext=m4a]/b[ext=mp4]/b",
            "--merge-output-format",
            "mp4",
            "-o",
            str(template),
            VIDEO_URL,
        ],
        check=True,
    )
    video = next(
        path
        for path in ASSETS.glob("trimble-selection-demo.*")
        if path.suffix in {".mp4", ".mkv", ".webm"}
    )
    try:
        for timestamp, filename in FRAMES.items():
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-ss",
                    timestamp,
                    "-i",
                    str(video),
                    "-frames:v",
                    "1",
                    str(ASSETS / filename),
                ],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
    finally:
        video.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
