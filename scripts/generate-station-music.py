"""Generate the optional source music once; credentials come from the environment."""
import hashlib
import json
import os
from pathlib import Path
import urllib.request
import urllib.error

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "artifacts/audio-source/station-music.mp3"


def main():
    if TARGET.exists():
        print("Music source already exists; skipped generation.")
        return
    design = json.loads((ROOT / "scripts/music-design.json").read_text())
    request = urllib.request.Request(
        "https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128",
        data=json.dumps(design).encode(),
        headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"], "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=240) as response:
            data = response.read()
            cost = response.headers.get("character-cost")
    except urllib.error.HTTPError as error:
        # Do not print request headers or credentials.
        print(json.dumps({"http_error": error.code, "detail": error.read().decode()[:1000]}))
        raise SystemExit(1)
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_bytes(data)
    TARGET.with_suffix(".json").write_text(json.dumps({
        **design, "credits": cost, "sha256": hashlib.sha256(data).hexdigest(),
    }, indent=2))
    print(json.dumps({"bytes": len(data), "credits": cost}))


if __name__ == "__main__":
    main()
