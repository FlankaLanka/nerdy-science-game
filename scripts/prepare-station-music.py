"""Make a quiet stereo music loop. Requires ffmpeg and numpy; no API calls."""
from pathlib import Path
import json
import subprocess
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
RATE = 44100
SOURCE = ROOT / "artifacts/audio-source/station-music.mp3"
TARGET = ROOT / "public/audio/station-music.mp3"
raw = subprocess.check_output([
    "ffmpeg", "-v", "error", "-i", str(SOURCE), "-af", "highpass=f=70,lowpass=f=12500",
    "-f", "f32le", "-ac", "2", "-ar", str(RATE), "-",
])
samples = np.frombuffer(raw, dtype="<f4").reshape(-1, 2).copy()
# Merge the matching harmony at the ends, then rotate the seam into the loop.
# The new beginning and end are adjacent samples from the original recording.
overlap = RATE * 4
phase = np.linspace(0, np.pi / 2, overlap)[:, None]
seam = samples[-overlap:] * np.cos(phase) + samples[:overlap] * np.sin(phase)
samples = np.concatenate((samples[overlap:-overlap], seam))
peak = float(np.max(np.abs(samples)))
rms = float(np.sqrt(np.mean(samples * samples)))
samples *= min(.5 / max(peak, 1e-6), .13 / max(rms, 1e-6))
TARGET.parent.mkdir(parents=True, exist_ok=True)
subprocess.run([
    "ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(RATE), "-ac", "2", "-i", "-",
    "-codec:a", "libmp3lame", "-b:a", "128k", "-map_metadata", "-1", str(TARGET),
], input=samples.astype("<f4").tobytes(), check=True)
print(json.dumps({"seconds": round(len(samples) / RATE, 3), "bytes": TARGET.stat().st_size,
    "peak": float(np.max(np.abs(samples))), "rms": float(np.sqrt(np.mean(samples * samples)))}))
