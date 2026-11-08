#!/usr/bin/env python3
"""Capture timestamped sectioning states and English captions from Solibri."""

from pathlib import Path
import shutil
import subprocess
import tempfile

ASSETS = Path(__file__).resolve().parent
YTDLP = shutil.which("yt-dlp") or "/opt/venv/bin/yt-dlp"
URL = "https://www.youtube.com/watch?v=76ujuIL4_KU"
FRAMES = {
    "00:00:31": "solibri-plane-added.png",
    "00:00:43": "solibri-plane-repositioned.png",
    "00:01:06": "solibri-multiple-planes.png",
    "00:01:28": "solibri-active-plane-flip.png",
    "00:01:41": "solibri-plane-removed.png",
}


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="section-clipping-") as temp_dir:
        work = Path(temp_dir)
        output = work / "solibri-section.%(ext)s"
        run([
            YTDLP, "--no-playlist",
            "-f", "bv*[height<=720]+ba/b[height<=720]",
            "--merge-output-format", "mp4",
            "--write-auto-subs", "--sub-langs", "en", "--sub-format", "vtt",
            "-o", str(output), URL,
        ])
        transcript = next(work.glob("*.vtt"), None)
        if transcript:
            shutil.copy2(transcript, ASSETS / "solibri-sectioning-transcript.en.vtt")
        video = next(work.glob("*.mp4"))
        for timestamp, filename in FRAMES.items():
            run([
                "ffmpeg", "-v", "error", "-y", "-ss", timestamp,
                "-i", str(video), "-frames:v", "1", str(ASSETS / filename),
            ])


if __name__ == "__main__":
    main()