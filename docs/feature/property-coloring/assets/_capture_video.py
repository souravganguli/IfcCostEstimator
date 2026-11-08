#!/usr/bin/env python3
"""Capture timestamped colouring states and English captions for property coloring.

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
        "product": "navisworks",
        "url": "https://www.youtube.com/watch?v=3z2PuJUD3W0",
        "transcript": "navisworks-appearance-profiler-transcript.en.vtt",
        "frames": {
            "00:00:44": "navisworks-appearance-profiler-dialog.png",
            "00:02:40": "navisworks-appearance-profiler-condition.png",
            "00:03:35": "navisworks-appearance-profiler-applied.png",
            "00:07:20": "navisworks-appearance-profiler-search-set.png",
        },
    },
    {
        "product": "bimcollab",
        "url": "https://www.youtube.com/watch?v=UswgkokdMmk",
        "transcript": "bimcollab-smart-view-autocolor-transcript.en.vtt",
        "frames": {
            "00:00:12": "bimcollab-smart-view-rule.png",
            "00:00:25": "bimcollab-smart-view-autocolor-action.png",
            "00:00:35": "bimcollab-smart-view-legend.png",
        },
    },
]


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    for video in VIDEOS:
        with tempfile.TemporaryDirectory(prefix="property-coloring-") as temp_dir:
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
