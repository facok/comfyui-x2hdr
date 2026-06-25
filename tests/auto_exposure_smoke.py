import sys
from pathlib import Path

import torch

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from grading import compute_auto_exposure_ev  # noqa: E402


def _daylight_with_bright_sky(width=256, height=128):
    sky_height = int(height * 0.55)
    y = torch.linspace(0.0, 1.0, height).reshape(height, 1)
    x = torch.linspace(0.0, 1.0, width).reshape(1, width)
    hdr = torch.zeros(1, height, width, 3)
    hdr[:, :sky_height, :, :] = torch.tensor([6.0, 7.2, 8.0])

    ground = 0.22 * (0.65 + 0.7 * y[sky_height:]) * (0.9 + 0.2 * x)
    hdr[:, sky_height:, :, :] = torch.stack((ground * 1.1, ground, ground * 0.85), dim=-1)
    return hdr.float()


def main():
    daylight_ev = compute_auto_exposure_ev(_daylight_with_bright_sky())
    if daylight_ev < -1.0:
        raise SystemExit(f"daylight auto exposure is too dark ({daylight_ev:.3f} EV)")

    midgray_ev = compute_auto_exposure_ev(torch.full((1, 64, 64, 3), 0.18))
    if abs(midgray_ev) > 0.35:
        raise SystemExit(f"mid-gray should stay near neutral exposure ({midgray_ev:.3f} EV)")

    low_light_ev = compute_auto_exposure_ev(torch.full((1, 64, 64, 3), 0.03))
    if low_light_ev < 2.0:
        raise SystemExit(f"low-light auto exposure should brighten ({low_light_ev:.3f} EV)")

    specular = torch.full((1, 128, 256, 3), 0.18)
    specular[:, 10:26, 210:230, :] = 50.0
    specular_ev = compute_auto_exposure_ev(specular)
    if abs(specular_ev - midgray_ev) > 0.25:
        raise SystemExit(f"small specular highlight should not dominate exposure ({specular_ev:.3f} EV)")

    print("Auto exposure smoke passed")


if __name__ == "__main__":
    main()
