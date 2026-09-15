"""Trim and level generated foley. Requires ffmpeg and numpy; no API calls."""
from pathlib import Path
import json
import subprocess
import wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
RATE = 44100
SOURCE = ROOT / "artifacts/audio-source"
DESTINATION = ROOT / "public/audio"
DESTINATION.mkdir(parents=True, exist_ok=True)
report = {}
for name in json.loads((ROOT / "scripts/sound-design.json").read_text()):
    raw = subprocess.check_output([
        "ffmpeg", "-v", "error", "-i", str(SOURCE / f"{name}.mp3"),
        "-af", "highpass=f=75,lowpass=f=11000", "-f", "f32le", "-ac", "1", "-ar", str(RATE), "-",
    ])
    samples = np.frombuffer(raw, dtype="<f4").copy()
    if name == "ventilation":
        # Overlap the source ends before rotating the seam into the middle.
        # WAV preserves the exact loop length without encoder padding.
        overlap = int(RATE * .6)
        phase = np.linspace(0, np.pi / 2, overlap)
        seam = samples[-overlap:] * np.cos(phase) + samples[:overlap] * np.sin(phase)
        samples = np.concatenate((samples[overlap:-overlap], seam))
    else:
        threshold = np.max(np.abs(samples)) * (.06 if name in ("connector", "relay") else .025)
        audible = np.flatnonzero(np.abs(samples) > threshold)
        if len(audible):
            start = max(0, audible[0] - int(RATE * .006))
            end = min(len(samples), audible[-1] + int(RATE * .06))
            samples = samples[start:end]
        fade_in, fade_out = min(88, len(samples)), min(882, len(samples))
        samples[:fade_in] *= np.linspace(0, 1, fade_in)
        samples[-fade_out:] *= np.linspace(1, 0, fade_out)
    # Preserve transients, leave headroom, and cap sustained machinery loudness.
    peak = float(np.max(np.abs(samples)))
    rms = float(np.sqrt(np.mean(samples * samples)))
    samples *= min(.56 / max(peak, 1e-6), .14 / max(rms, 1e-6))
    pcm = (samples * 32767).astype("<i2").tobytes()
    extension = "wav" if name == "ventilation" else "mp3"
    target = DESTINATION / f"{name}.{extension}"
    if extension == "wav":
        with wave.open(str(target), "wb") as output:
            output.setnchannels(1)
            output.setsampwidth(2)
            output.setframerate(RATE)
            output.writeframes(pcm)
    else:
        subprocess.run([
            "ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(RATE), "-ac", "1", "-i", "-",
            "-codec:a", "libmp3lame", "-b:a", "128k", "-map_metadata", "-1", str(target),
        ], input=pcm, check=True)
    report[name] = {"seconds": round(len(samples) / RATE, 3), "bytes": target.stat().st_size}
print(json.dumps(report, indent=2))
