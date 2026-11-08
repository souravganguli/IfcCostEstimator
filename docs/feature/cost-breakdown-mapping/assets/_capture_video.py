#!/usr/bin/env python3
"""Capture timestamped cost-planner states for cost breakdown mapping.

The English auto-caption VTT was fetched separately (yt-dlp --skip-download
--write-auto-subs) because YouTube rate-limited subtitle requests (HTTP 429);
this script downloads the public video (capped at 720p) into a temporary
directory without subtitles, extracts named frames with ffmpeg, then deletes
the full video with the temporary directory.
"""

from pathlib import Path
import shutil
import subprocess
import tempfile

ASSETS = Path(__file__).resolve().parent
YTDLP = shutil.which("yt-dlp") or "/opt/venv/bin/yt-dlp"

VIDEOS = [
    {
        "product": "vico-component",
        "url": "https://www.youtube.com/watch?v=D_p7Jc89n5Q",
        "frames": {
            "00:01:40": "vico-cost-component-code.png",
            "00:02:40": "vico-cost-component-quantity-consumption-waste.png",
            "00:02:57": "vico-cost-component-total.png",
        },
    },
    {
        "product": "vico-formula",
        "url": "https://www.youtube.com/watch?v=CuWS48MrzoQ",
        "frames": {
            "00:01:08": "vico-formula-editor-takeoff-quantities.png",
            "00:01:25": "vico-formula-linked-source-quantity.png",
        },
    },
]


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def main() -> None:
    for video in VIDEOS:
        with tempfile.TemporaryDirectory(prefix="cost-breakdown-mapping-") as temp_dir:
            work = Path(temp_dir)
            run([YTDLP, "-f", "bv*[height<=720]+ba/b[height<=720]", "--merge-output-format", "mp4",
                 "-o", str(work / f"{video['product']}.%(ext)s"), video["url"]])
            mp4 = next(work.glob("*.mp4"))
            for timestamp, filename in video["frames"].items():
                run(["ffmpeg", "-y", "-loglevel", "error", "-ss", timestamp,
                     "-i", str(mp4), "-frames:v", "1", str(ASSETS / filename)])


if __name__ == "__main__":
    main()
