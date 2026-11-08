#!/usr/bin/env python3
"""Download public measurement demos temporarily, keep English captions, and
extract stills at transcript-located timestamps. Full videos are deleted."""

from pathlib import Path
import shutil
import subprocess
import tempfile

ASSETS = Path(__file__).resolve().parent
YTDLP = shutil.which("yt-dlp") or "/opt/venv/bin/yt-dlp"
VIDEOS = [
    {
        "product": "solibri",
        "url": "https://www.youtube.com/watch?v=Itl4Kn8M2ZA",
        "frames": {
            "00:00:52": "solibri-video-dimension-start-00m52s.png",
            "00:01:00": "solibri-video-dimension-placed-01m00s.png",
            "00:01:05": "solibri-video-snap-indicators-01m05s.png",
            "00:01:19": "solibri-video-vertical-dimension-01m19s.png",
            "00:01:31": "solibri-video-dimension-through-transparent-01m31s.png",
        },
    },
    {
        "product": "trimble",
        "url": "https://www.youtube.com/watch?v=Q8eu60g_i_4",
        "frames": {
            "00:02:14": "trimble-video-measure-options-02m14s.png",
            "00:02:22": "trimble-video-point-measurement-02m22s.png",
            "00:02:30": "trimble-video-measurements-locked-02m30s.png",
            "00:02:53": "trimble-video-done-or-delete-02m53s.png",
        },
    },
]


def run(cmd: list[str], check: bool = True) -> None:
    print("+", " ".join(cmd))
    subprocess.run(cmd, check=check)


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="mm-video-") as tmp:
        work = Path(tmp)
        for v in VIDEOS:
            product, url = v["product"], v["url"]
            run([
                YTDLP, "--no-playlist",
                "-f", "bv*[height<=720]+ba/b[height<=720]",
                "--merge-output-format", "mp4",
                "--write-auto-subs", "--sub-langs", "en", "--sub-format", "vtt",
                "-o", str(work / f"{product}-measure.%(ext)s"), url,
            ])
            vtt = next(work.glob(f"{product}-measure*.vtt"), None)
            if vtt:
                shutil.copy(vtt, ASSETS / f"{product}-measure-transcript.en.vtt")
            video = work / f"{product}-measure.mp4"
            for ts, name in v["frames"].items():
                run(["ffmpeg", "-v", "error", "-y", "-ss", ts, "-i", str(video),
                     "-frames:v", "1", str(ASSETS / name)])
            video.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
