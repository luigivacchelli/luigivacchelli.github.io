#!/usr/bin/env python3
"""Validate local media references and reserved aspect ratios in index.html.

Requires ImageMagick (`magick`) and FFmpeg (`ffprobe`). Run from any directory:
    python3 tools/check_media_dimensions.py
"""

from html.parser import HTMLParser
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parent.parent
HTML_FILE = ROOT / "index.html"
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}
VIDEO_SUFFIXES = {".mp4", ".mov", ".m4v", ".webm"}
ASSET_SUFFIXES = IMAGE_SUFFIXES | VIDEO_SUFFIXES
RATIO_TOLERANCE = 0.025


class MediaParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.elements = []
        self.video_stack = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "video":
            entry = {"tag": tag, "attrs": attrs, "sources": []}
            self.elements.append(entry)
            self.video_stack.append(entry)
            return
        if tag == "source" and self.video_stack:
            self.video_stack[-1]["sources"].append(attrs)
            return
        if tag == "img":
            self.elements.append({"tag": tag, "attrs": attrs, "sources": []})

    def handle_endtag(self, tag):
        if tag == "video" and self.video_stack:
            self.video_stack.pop()


def local_path(value):
    if not value or value.startswith(("https://", "http://", "data:", "#")):
        return None
    path = value.split("?", 1)[0].split("#", 1)[0]
    return (ROOT / path.lstrip("/")).resolve()


def ratio_close(actual, declared):
    return abs(actual - declared) / actual <= RATIO_TOLERANCE


def dimensions(path, kind):
    if kind == "image":
        result = subprocess.run(
            ["magick", "identify", "-auto-orient", "-format", "%w %h", str(path)],
            check=True, capture_output=True, text=True,
        )
        width, height = map(int, result.stdout.split())
        return width / height

    result = subprocess.run(
        [
            "ffprobe", "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=display_aspect_ratio,width,height,sample_aspect_ratio",
            "-of", "default=noprint_wrappers=1", str(path),
        ],
        check=True, capture_output=True, text=True,
    )
    fields = dict(line.split("=", 1) for line in result.stdout.splitlines() if "=" in line)
    display = fields.get("display_aspect_ratio", "N/A")
    if display != "N/A" and ":" in display:
        numerator, denominator = map(float, display.split(":"))
        return numerator / denominator
    width, height = int(fields["width"]), int(fields["height"])
    sample = fields.get("sample_aspect_ratio", "N/A")
    if sample != "N/A" and ":" in sample:
        numerator, denominator = map(float, sample.split(":"))
        return (width * numerator / denominator) / height
    return width / height


def main():
    parser = MediaParser()
    parser.feed(HTML_FILE.read_text(encoding="utf-8"))
    errors = []
    checked = set()

    for element in parser.elements:
        tag, attrs = element["tag"], element["attrs"]
        width, height = attrs.get("width"), attrs.get("height")
        ratio = None
        candidates = []

        if tag == "img":
            candidates.extend((attrs.get("src"), attrs.get("data-hires-src")))
            for attribute in ("data-gallery", "data-hires-gallery"):
                candidates.extend(attrs.get(attribute, "").split(","))
            ratio_source = attrs.get("src")
        else:
            candidates.append(attrs.get("poster"))
            sources = element["sources"]
            source_attrs = sources or [attrs]
            for source in source_attrs:
                candidates.extend((source.get("src"), source.get("data-src")))
            direct = attrs.get("src") or attrs.get("data-src")
            ratio_source = next((s.get("src") or s.get("data-src") for s in source_attrs if s.get("src") or s.get("data-src")), direct)

        local_assets = []
        for value in candidates:
            path = local_path(value)
            if path is None or path.suffix.lower() not in ASSET_SUFFIXES:
                continue
            if not path.is_file():
                errors.append(f"Missing local media: {path.relative_to(ROOT)}")
                continue
            local_assets.append(path)
            checked.add(path)

        if not ratio_source:
            continue
        ratio_path = local_path(ratio_source)
        if ratio_path is None or not ratio_path.is_file():
            continue
        if not width or not height:
            try:
                kind = "image" if ratio_path.suffix.lower() in IMAGE_SUFFIXES else "video"
                ratio = dimensions(ratio_path, kind)
            except (OSError, ValueError, subprocess.CalledProcessError, KeyError) as error:
                errors.append(f"Could not inspect {ratio_path.relative_to(ROOT)}: {error}")
                continue
            errors.append(
                f"Missing width/height on <{tag}> for {ratio_path.relative_to(ROOT)}; "
                f"suggested ratio {ratio:.4f} (use matching oriented dimensions)."
            )
            continue
        try:
            declared = int(width) / int(height)
        except ValueError:
            errors.append(f"Non-numeric width/height on <{tag}> for {ratio_path.relative_to(ROOT)}")
            continue
        for path in local_assets:
            kind = "image" if path.suffix.lower() in IMAGE_SUFFIXES else "video"
            try:
                ratio = dimensions(path, kind)
            except (OSError, ValueError, subprocess.CalledProcessError, KeyError) as error:
                errors.append(f"Could not inspect {path.relative_to(ROOT)}: {error}")
                continue
            if not ratio_close(ratio, declared):
                errors.append(
                    f"Aspect ratio mismatch for {path.relative_to(ROOT)}: "
                    f"media {ratio:.4f}, declared {width}:{height} ({declared:.4f})."
                )

    print(f"Checked {len(parser.elements)} media elements and {len(checked)} referenced local files.")
    if errors:
        print("\n".join(f"ERROR: {error}" for error in errors))
        return 1
    print("All referenced media exists and declared aspect ratios are within tolerance.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except FileNotFoundError as error:
        print(f"Missing required tool or file: {error}", file=sys.stderr)
        sys.exit(2)
