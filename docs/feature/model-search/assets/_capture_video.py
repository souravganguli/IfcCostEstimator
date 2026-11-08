#!/usr/bin/env python3
"""Download a public Solibri walkthrough temporarily and extract study frames."""

from pathlib import Path
import subprocess


ASSETS = Path(__file__).resolve().parent
VIDEO_URL = "https://www.youtube.com/watch?v=_me6LNVbqhI"
FRAMES = {
    "00:00:45": "solibri-video-00m45s.png",
    "00:02:00": "solibri-video-02m00s.png",
    "00:04:00": "solibri-video-04m00s.png",
    "00:06:00": "solibri-video-06m00s.png",
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
        str(ASSETS / "solibri-demo.%(ext)s"),
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
        str(ASSETS / "solibri-transcript"),
        VIDEO_URL,
    ], check=False)

    video = next(path for path in ASSETS.glob("solibri-demo.*") if path.suffix in {".mp4", ".mkv", ".webm"})
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
