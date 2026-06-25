import json
import sys
import types
from pathlib import Path

import torch

ROOT = Path(__file__).resolve().parents[1]
COMFY_ROOT = ROOT.parents[1]
for path in (COMFY_ROOT, ROOT.parent):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

PACKAGE_NAME = "x2hdr_dynamic_range_qa_package"
package = types.ModuleType(PACKAGE_NAME)
package.__path__ = [str(ROOT)]
sys.modules.setdefault(PACKAGE_NAME, package)


class _Routes:
    def post(self, _path):
        return lambda fn: fn


class _PromptServer:
    instance = types.SimpleNamespace(routes=_Routes())


sys.modules.setdefault("server", types.SimpleNamespace(PromptServer=_PromptServer))
sys.modules.setdefault(
    "folder_paths",
    types.SimpleNamespace(
        get_output_directory=lambda: str(ROOT),
        get_temp_directory=lambda: str(ROOT / "tmp"),
        get_save_image_path=lambda prefix, output_dir, width, height: (
            str(ROOT / "tmp"),
            prefix,
            0,
            "",
            prefix,
        ),
    ),
)

from x2hdr_dynamic_range_qa_package.hdr_utils import compute_dynamic_range_qa  # noqa: E402
from x2hdr_dynamic_range_qa_package.nodes import X2HDRDynamicRangeQA  # noqa: E402


def _hdr_scene(width=96, height=48):
    x = torch.linspace(0.0, 1.0, width).reshape(1, width)
    y = torch.linspace(0.0, 1.0, height).reshape(height, 1)
    lum = 0.01 * torch.pow(torch.tensor(64000.0), x * 0.75 + y * 0.25)
    return torch.stack((lum * 1.05, lum, lum * 0.9), dim=-1).unsqueeze(0).float()


def main():
    hdr = _hdr_scene()
    qa = compute_dynamic_range_qa(hdr)
    if qa["decision"]["verdict"] != "pass":
        raise SystemExit(f"expected HDR scene to pass dynamic range QA, got {qa['decision']['verdict']}")
    first_frame = qa["frames"][0]
    if first_frame["key_metrics"]["max_rgb"] <= 1.0:
        raise SystemExit("HDR scene should exceed SDR max RGB")
    if first_frame["key_metrics"]["hdr_headroom_p995_stops"] < 3.0:
        raise SystemExit("HDR scene should have highlight headroom")

    sdr = torch.full_like(hdr, 0.18)
    mixed = torch.cat((hdr, sdr), dim=0)
    mixed_qa = compute_dynamic_range_qa(mixed)
    if mixed_qa["decision"]["verdict"] != "review":
        raise SystemExit("mixed HDR/SDR batch should require review")
    if mixed_qa["decision"]["pass_count"] != 1 or mixed_qa["decision"]["frame_count"] != 2:
        raise SystemExit("mixed batch pass count should be reported per frame")

    hdr_with_black_band = hdr.clone()
    hdr_with_black_band[:, :5, :, :] = 0.0
    black_qa = compute_dynamic_range_qa(hdr_with_black_band)
    if black_qa["decision"]["verdict"] != "pass":
        raise SystemExit("black borders should not zero out positive dynamic range")
    if black_qa["frames"][0]["key_metrics"]["black_fraction"] <= 0.0:
        raise SystemExit("black fraction should be reported")

    node = X2HDRDynamicRangeQA()
    qa_json, strip = node.qa(hdr, save_preview=False)
    parsed = json.loads(qa_json)
    if list(parsed.keys())[:4] != ["decision", "guide", "thresholds", "summary"]:
        raise SystemExit("QA JSON should start with decision, guide, thresholds, and summary")
    if parsed["preview_ev_values"] != [-4.0, -2.0, 0.0, 2.0, 4.0]:
        raise SystemExit("preview EV values changed unexpectedly")
    if tuple(strip.shape) != (1, hdr.shape[1], hdr.shape[2] * 5, 3):
        raise SystemExit(f"unexpected exposure strip shape: {tuple(strip.shape)}")
    if not torch.isfinite(strip).all() or float(strip.min()) < 0.0 or float(strip.max()) > 1.0:
        raise SystemExit("exposure strip should be finite LDR data")

    print("Dynamic range QA smoke passed")


if __name__ == "__main__":
    main()
