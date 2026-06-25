import sys
from pathlib import Path

import torch

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from hdr_utils import decode_image_to_hdr, pu21_decode  # noqa: E402


def main():
    pu21 = torch.linspace(0.05, 0.85, 16 * 16 * 3, dtype=torch.float32).reshape(1, 16, 16, 3)
    decoded = pu21_decode(pu21)
    decoded_max = float(decoded.max().item())

    hdr, metrics = decode_image_to_hdr(
        pu21,
        input_range="0_1",
        apply_l_peak=True,
        l_peak=4000.0,
        target_luminance=0.0,
        clamp_pu21=True,
    )

    max_value = float(hdr.max().item())
    if abs(max_value - 4000.0) > 0.5:
        raise SystemExit(f"l_peak scaling should normalize max RGB to 4000, got {max_value:.3f}")

    expected_scale = 4000.0 / decoded_max
    if abs(float(metrics["l_peak_scale"]) - expected_scale) > expected_scale * 0.001:
        raise SystemExit("l_peak_scale metric does not match decode-time scale")

    if float(metrics["l_peak_scale"]) == 4000.0:
        raise SystemExit("l_peak scaling regressed to multiplying by l_peak")

    print("Decode l_peak smoke passed")


if __name__ == "__main__":
    main()
