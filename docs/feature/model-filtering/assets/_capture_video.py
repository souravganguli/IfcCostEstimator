#!/usr/bin/env python3
"""Download the official Solibri filtering demo temporarily and extract frames."""

from pathlib import Path
import subprocess


ASSETS = Path(__file__).resolve().parent
VIDEO_URL = "https://www.youtube.com/watch?v=4e6sYZ1fM44"
FRAMES = {
    "00:00:15": "solibri-filtering-00m15s.png",
    "00:00:40": "solibri-filtering-00m40s.png",
    "00:01:05": "solibri-filtering-01m05s.png",
}


def run(command: list[str], check: bool = True) -> subprocess.CompletedProcess[str]:
    print("+", " ".join(command))
    return subprocess.run(command, check=check, text=True)


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    run([
        "yt-dlp",
        "--no-playlist",
        "-f",
        "bv*[ext=mp4][height<=720]+ba[ext=m4a]/b[ext=mp4]/b",
        "--merge-output-format",
        "mp4",
        "-o",
        str(ASSETS / "solibri-filtering-demo.%(ext)s"),
        VIDEO_URL,
    ])
    run([
        "yt-dlp",
        "--no-playlist",
        "--write-auto-subs",
        "--write-subs",
        "--sub-langs",
        "en",
        "--sub-format",
        "vtt",
        "--skip-download",
        "-o",
        str(ASSETS / "solibri-filtering-transcript"),
        VIDEO_URL,
    ], check=False)

    video = next(path for path in ASSETS.glob("solibri-filtering-demo.*") if path.suffix in {".mp4", ".mkv", ".webm"})
    try:
        for timestamp, filename in FRAMES.items():
            run([
                "ffmpeg",
                "-y",
                "-ss",
                timestamp,
                "-i",
                str(video),
                "-frames:v",
                "1",
                str(ASSETS / filename),
            ])
    finally:
        video.unlink(missing_ok=True)


if __name__ == "__main__":
    main()