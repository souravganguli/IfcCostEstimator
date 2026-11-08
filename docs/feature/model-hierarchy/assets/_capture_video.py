#!/usr/bin/env python3
"""Download a public Solibri Model Tree walkthrough temporarily and extract states."""

from pathlib import Path
import subprocess


ASSETS = Path(__file__).resolve().parent
VIDEO_URL = "https://www.youtube.com/watch?v=18Qd1DmgGtI"
FRAMES = {
    "00:00:10": "solibri-video-containment-00m10s.png",
    "00:00:39": "solibri-video-selection-sync-00m39s.png",
    "00:00:56": "solibri-video-component-00m56s.png",
    "00:01:44": "solibri-video-layer-01m44s.png",
    "00:02:28": "solibri-video-federated-floor-02m28s.png",
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
        str(ASSETS / "solibri-model-tree-demo.%(ext)s"),
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
        str(ASSETS / "solibri-model-tree-transcript"),
        VIDEO_URL,
    ], check=False)

    video = next(path for path in ASSETS.glob("solibri-model-tree-demo.*") if path.suffix in {".mp4", ".mkv", ".webm"})
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
