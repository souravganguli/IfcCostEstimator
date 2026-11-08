#!/usr/bin/env python3
"""Capture timestamped navigation states and English captions for viewer navigation.

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
        "product": "solibri",
        "url": "https://www.youtube.com/watch?v=I30WFdEDCfw",
        "transcript": "solibri-navigation-transcript.en.vtt",
        "frames": {
            "00:00:28": "solibri-navigation-modes.png",
            "00:00:56": "solibri-preset-positions.png",
            "00:01:01": "solibri-preset-applied.png",
            "00:01:40": "solibri-orbit-free-space.png",
        },
    },
    {
        "product": "navisworks",
        "url": "https://www.youtube.com/watch?v=oOx8rvFFHrg",
        "transcript": "navisworks-viewcube-transcript.en.vtt",
        "frames": {
            "00:00:12": "navisworks-viewcube-face.png",
            "00:00:21": "navisworks-viewcube-corner.png",
            "00:00:34": "navisworks-viewcube-compass.png",
            "00:02:20": "navisworks-viewcube-projection-menu.png",
            "00:02:27": "navisworks-viewcube-home.png",
            "00:03:02": "navisworks-set-current-view-as-home.png",
        },
    },
]


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    for video in VIDEOS:
        with tempfile.TemporaryDirectory(prefix="viewer-navigation-") as temp_dir:
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
