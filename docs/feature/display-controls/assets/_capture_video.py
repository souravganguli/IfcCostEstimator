#!/usr/bin/env python3
"""Capture timestamped display states and English captions for display controls.

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
        "url": "https://www.youtube.com/watch?v=anNq5hZfAEk",
        "transcript": "solibri-transparent-hide-transcript.en.vtt",
        "frames": {
            "00:00:55": "solibri-make-transparent-menu.png",
            "00:01:05": "solibri-transparent-applied.png",
            "00:01:55": "solibri-show-default-state.png",
        },
    },
    {
        "product": "navisworks",
        "url": "https://www.youtube.com/watch?v=NSb8O7ZePNk",
        "transcript": "navisworks-override-transparency-transcript.en.vtt",
        "frames": {
            "00:00:14": "navisworks-shaded-mode.png",
            "00:00:41": "navisworks-override-transparency.png",
            "00:00:50": "navisworks-transparent-walls.png",
        },
    },
]


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    for video in VIDEOS:
        with tempfile.TemporaryDirectory(prefix="display-controls-") as temp_dir:
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
