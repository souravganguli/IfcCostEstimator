#!/usr/bin/env python3
"""Capture timestamped plan-view states and English captions for plan view.

Downloads each public video (capped at 720p) into a temporary directory,
copies the English auto-caption VTT into this assets folder, extracts named
frames with ffmpeg, then deletes the full video with the temporary directory.
"""

from pathlib import Path
import shutil
import subprocess
import tempfile

ASSETS = Path(__file__).resolve().parent
YTDLP = shutil.which("yt-dlp") or "/opt/venv/bin/yt-dlp"

VIDEOS = [
    {
        "product": "revit",
        "url": "https://www.youtube.com/watch?v=gdDnZCreKJ4",
        "transcript": "revit-view-range-transcript.en.vtt",
        "frames": {
            "00:00:45": "revit-view-range-planes.png",
            "00:01:20": "revit-view-range-cut-elements.png",
            "00:01:33": "revit-view-range-projection-thin.png",
            "00:02:08": "revit-view-range-beyond-line-styles.png",
        },
    },
    {
        "product": "bimcollab",
        "url": "https://www.youtube.com/watch?v=vadN5ZJ1hwg",
        "transcript": "bimcollab-automatic-floor-plan-transcript.en.vtt",
        "frames": {
            "00:00:12": "bimcollab-floor-plan-ortho-top.png",
            "00:00:22": "bimcollab-floor-plan-storey-isolated.png",
            "00:00:34": "bimcollab-floor-plan-result.png",
        },
    },
]


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    for video in VIDEOS:
        with tempfile.TemporaryDirectory(prefix="plan-view-") as temp_dir:
            work = Path(temp_dir)
            run([
                YTDLP, "--no-playlist", "--no-warnings",
                "-f", "bv*[height<=720]+ba/b[height<=720]",
                "--merge-output-format", "mp4",
                "--write-auto-subs", "--sub-langs", "en", "--sub-format", "vtt",
                "-o", str(work / f"{video['product']}.%(ext)s"), video["url"],
            ])
            transcript = next(work.glob("*.vtt"), None)
            if transcript:
                shutil.copy2(transcript, ASSETS / video["transcript"])
            mp4 = next(work.glob("*.mp4"))
            for timestamp, filename in video["frames"].items():
                run([
                    "ffmpeg", "-v", "error", "-y", "-ss", timestamp,
                    "-i", str(mp4), "-frames:v", "1", str(ASSETS / filename),
                ])


if __name__ == "__main__":
    main()
