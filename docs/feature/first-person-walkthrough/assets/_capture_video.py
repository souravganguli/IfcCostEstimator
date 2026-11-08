#!/usr/bin/env python3
"""Capture timestamped walkthrough states and English captions for first-person walkthrough.

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
        "url": "https://www.youtube.com/watch?v=ts6_llecMfg",
        "transcript": "navisworks-walk-transcript.en.vtt",
        "frames": {
            "00:01:44": "navisworks-walk-look.png",
            "00:02:08": "navisworks-walk-gravity-ramp.png",
            "00:02:25": "navisworks-walk-third-person.png",
            "00:02:41": "navisworks-walk-crouch-collision.png",
        },
    },
    {
        "product": "revizto",
        "url": "https://www.youtube.com/watch?v=MDQ-DIoz8rc",
        "transcript": "revizto-navigation-transcript.en.vtt",
        "frames": {
            "00:03:56": "revizto-walk-mode-toggle.png",
            "00:04:25": "revizto-walk-eye-level.png",
            "00:04:54": "revizto-walk-mode-off.png",
            "00:06:46": "revizto-game-mode-wasd.png",
        },
    },
]


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    for video in VIDEOS:
        with tempfile.TemporaryDirectory(prefix="first-person-walkthrough-") as temp_dir:
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
