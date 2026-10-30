---
name: capture-feature-media
description: 'Obtain screenshots and videos of a feature in use from comparable products. Use when researching how an established product implements a feature and you need at least one video of the feature in action plus screenshots of each distinct UI state. Covers yt-dlp downloads, ffmpeg frame extraction, transcript fetching, the browser screenshot fallback, and the mandatory per-feature assets folder and naming convention.'
---

# Capture Feature Media

Capture evidence of how a feature works in comparable products so a requirement
document can cite real UI states, video timestamps, and transcripts rather than
memory. This is phase 5 of the Product Analyst discovery process.

## When to use

- You are researching how an established product implements a requested feature.
- You need at least one video of the feature in action plus screenshots of each
  distinct UI state.
- You are about to write a requirement doc under `docs/feature/<slug>.md` and
  need traceable visual evidence for its findings.

Do not use this for non-UI work with no observable product behaviour; record
that no media applies and move on.

## Inputs

- `slug`: the kebab-case feature slug (matches `docs/feature/<slug>.md`).
- One or more comparable products, each with a public video, live demo, or docs
  page that shows the feature.

## Output location (mandatory)

Save **every** downloaded artifact under `docs/feature/<slug>/assets/` and
nowhere else — never next to the Markdown file or in a shared/ad-hoc folder.

- Name each file descriptively as `<product>-<state>.png` (or `.mp4`, `.vtt`).
- Record which user-flow step or finding each artifact illustrates.
- Reference it from the doc with a relative path:
  `![<Product> — <state>](<slug>/assets/<product>-<state>.png)`.

## Steps

1. **Create the assets folder** for the feature slug if it does not exist.
2. **Prepare tooling.** Ensure `yt-dlp` and `ffmpeg` are available; install what
   is missing with `pip`/the system package manager and report what you ran.
3. **Download the video** for each product with `yt-dlp` into the assets folder.
4. **Extract frames** with `ffmpeg` at intervals (~15-30s of the relevant
   section, or one frame per distinct interaction), naming each
   `<product>-<state>.png`.
5. **Fetch and parse the transcript** so claims can cite the video and specific
   timestamps.
6. **Fall back to the browser screenshot tool** for live demos or docs pages
   when no downloadable video exists.
7. **Map each artifact** to the user-flow step or finding it supports, and add
   it to the auditable source log (URL, title, product, what it showed).
8. **Report honestly** if a video or transcript is genuinely unavailable, and
   record why.

## Example commands

```bash
mkdir -p docs/feature/<slug>/assets

# Download the demo video
yt-dlp -f "bv*+ba/b" \
  -o "docs/feature/<slug>/assets/<product>-demo.%(ext)s" "<video-url>"

# Fetch the auto-generated transcript (no video download)
yt-dlp --write-auto-subs --sub-format vtt --skip-download \
  -o "docs/feature/<slug>/assets/<product>-transcript" "<video-url>"

# Extract one frame at a given timestamp as a named UI state
ffmpeg -ss 00:01:30 -i "docs/feature/<slug>/assets/<product>-demo.mp4" \
  -vframes 1 "docs/feature/<slug>/assets/<product>-clipping-active.png"
```

## Python batch script

When capturing several products or many frames, drive `yt-dlp`/`ffmpeg` from one
Python script rather than running commands by hand. Save it under the feature's
`assets/` folder (e.g. `docs/feature/<slug>/assets/_capture.py`) and report the
command you ran. Edit the `SLUG` and `PRODUCTS` entries, then run
`python docs/feature/<slug>/assets/_capture.py`.

```python
#!/usr/bin/env python3
"""Download comparable-product demo videos, extract named UI-state frames,
and fetch transcripts into docs/feature/<SLUG>/assets/."""
import subprocess
from pathlib import Path

SLUG = "<slug>"
ASSETS = Path(__file__).resolve().parent  # docs/feature/<slug>/assets

# One entry per product. `frames` maps a timestamp (HH:MM:SS) to the UI state
# name it captures; files are written as <product>-<state>.png.
PRODUCTS = [
    {
        "product": "<product>",
        "url": "<video-url>",
        "frames": {
            "00:01:30": "clipping-active",
            "00:02:05": "plane-dragged",
        },
    },
]


def run(cmd: list[str]) -> None:
    print("+", " ".join(cmd))
    subprocess.run(cmd, check=True)


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    for p in PRODUCTS:
        product, url = p["product"], p["url"]
        video = ASSETS / f"{product}-demo.mp4"

        # 1. Download the demo video.
        run([
            "yt-dlp", "-f", "bv*+ba/b",
            "-o", str(ASSETS / f"{product}-demo.%(ext)s"), url,
        ])

        # 2. Fetch the auto-generated transcript (VTT, no re-download).
        run([
            "yt-dlp", "--write-auto-subs", "--sub-format", "vtt",
            "--skip-download",
            "-o", str(ASSETS / f"{product}-transcript"), url,
        ])

        # 3. Extract one frame per distinct UI state.
        for ts, state in p["frames"].items():
            run([
                "ffmpeg", "-y", "-ss", ts, "-i", str(video),
                "-vframes", "1", str(ASSETS / f"{product}-{state}.png"),
            ])


if __name__ == "__main__":
    main()
```

## Transcript parsing

`yt-dlp --write-auto-subs --sub-format vtt` yields a `.vtt` file whose cues are
timestamped. Parse it to pull quotable lines with timestamps for citation.

```python
import re
from pathlib import Path

TS = re.compile(r"(\d{2}:\d{2}:\d{2})\.\d{3} -->")


def parse_vtt(path: str) -> list[tuple[str, str]]:
    """Return [(HH:MM:SS, text), ...] cues, de-duplicating repeated lines."""
    cues: list[tuple[str, str]] = []
    current_ts, seen = None, set()
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        m = TS.match(line)
        if m:
            current_ts = m.group(1)
            continue
        text = line.strip()
        if current_ts and text and not text.startswith(("WEBVTT", "Kind:", "Language:")):
            clean = re.sub(r"<[^>]+>", "", text)  # strip inline timing tags
            if clean and clean not in seen:
                seen.add(clean)
                cues.append((current_ts, clean))
    return cues


if __name__ == "__main__":
    for ts, text in parse_vtt("docs/feature/<slug>/assets/<product>-transcript.en.vtt"):
        print(f"[{ts}] {text}")
```

Cite transcript lines in the requirement doc as, e.g.,
`<product> demo at 01:30 — "…"`, and tie them to the frame that shows the same
state.

## Checklist

- [ ] All artifacts saved under `docs/feature/<slug>/assets/`.
- [ ] At least one video of the feature in action for each established product.
- [ ] Frames named `<product>-<state>.png` and mapped to flow steps/findings.
- [ ] Transcript fetched and timestamps cited (or absence reported honestly).
- [ ] Source log updated for every artifact (URL, title, product, what it showed).
- [ ] Browser screenshot fallback used where no downloadable video exists.
