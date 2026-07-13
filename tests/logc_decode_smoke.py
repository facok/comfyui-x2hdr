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

PACKAGE_NAME = "x2hdr_logc_smoke_package"
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

from x2hdr_logc_smoke_package.hdr_utils import (  # noqa: E402
    LOGC3_CUT,
    LOGC3_E,
    LOGC3_F,
    LOGC4_C,
    LOGC4_T,
    decode_logc_image,
    logc3_decode,
    logc4_decode,
)
from x2hdr_logc_smoke_package.nodes import (  # noqa: E402
    NODE_CLASS_MAPPINGS,
    NODE_DISPLAY_NAME_MAPPINGS,
    X2HDRLogC3Decode,
    X2HDRLogC4Decode,
)


def _assert_close(actual, expected, atol=1.0e-5):
    if not torch.allclose(actual, expected, atol=atol, rtol=1.0e-5):
        raise SystemExit(f"values differ:\nactual={actual}\nexpected={expected}")


def main():
    logc3_codes = torch.tensor(
        [0.0, LOGC3_E * LOGC3_CUT + LOGC3_F, 0.391006832, 1.0],
        dtype=torch.float32,
    )
    logc3_expected = torch.tensor(
        [-0.0172904183, LOGC3_CUT, 0.18, 55.0795767],
        dtype=torch.float32,
    )
    _assert_close(logc3_decode(logc3_codes), logc3_expected, atol=2.0e-5)

    logc4_codes = torch.tensor([0.0, LOGC4_C, 0.2783958365, 1.0], dtype=torch.float32)
    logc4_expected = torch.tensor([LOGC4_T, 0.0, 0.18, 469.8], dtype=torch.float32)
    _assert_close(logc4_decode(logc4_codes), logc4_expected, atol=1.0e-4)

    boundary_codes = torch.tensor([-1.0e-6, 0.0, 1.0e-6], dtype=torch.float32)
    boundary_values = logc4_decode(boundary_codes, clamp_logc=False)
    if float(torch.max(torch.diff(boundary_values)).item()) > 5.0e-7:
        raise SystemExit(f"LogC4 inverse is discontinuous at code 0: {boundary_values}")

    dense_codes = torch.linspace(0.0, 1.0, 4097)
    for name, decoded in (
        ("LogC3", logc3_decode(dense_codes)),
        ("LogC4", logc4_decode(dense_codes)),
    ):
        if not torch.isfinite(decoded).all() or not torch.all(torch.diff(decoded) >= 0.0):
            raise SystemExit(f"{name} decode should be finite and monotonic")

    clamped = logc4_decode(torch.tensor([-0.5, 1.5]))
    _assert_close(clamped, logc4_decode(torch.tensor([0.0, 1.0])))

    encoded = torch.tensor([0.0, 0.5, 1.0]).reshape(1, 1, 1, 3)
    centered = encoded * 2.0 - 1.0
    direct_hdr, _ = decode_logc_image(encoded, curve="logc3")
    centered_hdr, _ = decode_logc_image(centered, curve="logc3", input_range="minus1_1")
    _assert_close(centered_hdr, direct_hdr)

    nchw_half = torch.empty((1, 3, 2, 5), dtype=torch.float16)
    nchw_half[:, 0] = 0.0
    nchw_half[:, 1] = 0.2783958365
    nchw_half[:, 2] = 1.0
    hdr, metrics = decode_logc_image(nchw_half, curve="logc4")
    if tuple(hdr.shape) != (1, 2, 5, 3) or hdr.dtype != torch.float32 or not hdr.is_contiguous():
        raise SystemExit(f"unexpected decoded IMAGE contract: {hdr.shape}, {hdr.dtype}")
    _assert_close(hdr[0, 0, 0], logc4_expected[[0, 2, 3]], atol=1.0e-3)
    if metrics["curve"] != "logc4" or not metrics["clamp_logc"]:
        raise SystemExit(f"unexpected LogC metrics: {metrics}")

    gray_hdr, _ = decode_logc_image(torch.full((2, 3, 5, 1), 0.5), curve="logc3")
    rgba_hdr, _ = decode_logc_image(torch.full((2, 3, 5, 4), 0.5), curve="logc3")
    if tuple(gray_hdr.shape) != (2, 3, 5, 3) or tuple(rgba_hdr.shape) != (2, 3, 5, 3):
        raise SystemExit("grayscale/RGBA inputs should produce RGB outputs")

    for key, cls, display_name in (
        ("X2HDRLogC3Decode", X2HDRLogC3Decode, "X2HDR LogC3 Decode"),
        ("X2HDRLogC4Decode", X2HDRLogC4Decode, "X2HDR LogC4 Decode"),
    ):
        if NODE_CLASS_MAPPINGS.get(key) is not cls:
            raise SystemExit(f"{key} is not registered")
        if NODE_DISPLAY_NAME_MAPPINGS.get(key) != display_name:
            raise SystemExit(f"unexpected display name for {key}")
        _, metrics_json = cls().decode(
            torch.full((1, 1, 1, 3), 0.5),
            input_range="0_1",
            clamp_logc=True,
        )
        if json.loads(metrics_json)["curve"] != key[5:10].lower():
            raise SystemExit(f"unexpected metrics JSON for {key}")

    print("LogC decode smoke passed")


if __name__ == "__main__":
    main()
