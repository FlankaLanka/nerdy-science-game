"""Generate source SFX once. The API key comes only from the process environment."""
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import urllib.request
import urllib.error

ROOT = Path(__file__).resolve().parents[1]
DESTINATION = ROOT / "artifacts/audio-source"


def main():
    key = os.environ["ELEVENLABS_API_KEY"]
    designs = json.loads((ROOT / "scripts/sound-design.json").read_text())
    DESTINATION.mkdir(parents=True, exist_ok=True)

    def generate(item):
        name, design = item
        target = DESTINATION / f"{name}.mp3"
        if target.exists():
            return {"sound": name, "status": "already generated"}
        body = {**design, "prompt_influence": 0.65, "model_id": "eleven_text_to_sound_v2"}
        request = urllib.request.Request(
            "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128",
            data=json.dumps(body).encode(),
            headers={"xi-api-key": key, "Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                data = response.read()
                cost = response.headers.get("character-cost")
            target.write_bytes(data)
            (DESTINATION / f"{name}.json").write_text(json.dumps({
                **body, "credits": cost, "sha256": hashlib.sha256(data).hexdigest(),
            }, indent=2))
            return {"sound": name, "bytes": len(data), "credits": cost}
        except urllib.error.HTTPError as error:
            return {"sound": name, "http_error": error.code}

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        for result in pool.map(generate, designs.items()):
            print(json.dumps(result), flush=True)


if __name__ == "__main__":
    main()
