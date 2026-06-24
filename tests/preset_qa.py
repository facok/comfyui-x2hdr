import re
import sys
import types
from pathlib import Path

import torch

ROOT = Path(__file__).resolve().parents[1]
COMFY_ROOT = ROOT.parents[1]
for path in (COMFY_ROOT, ROOT.parent):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

PACKAGE_NAME = "x2hdr_preset_qa_package"
package = types.ModuleType(PACKAGE_NAME)
package.__path__ = [str(ROOT)]
sys.modules.setdefault(PACKAGE_NAME, package)

from x2hdr_preset_qa_package.grading import grade_display  # noqa: E402
from x2hdr_preset_qa_package.nodes import _grade_params_from_mapping  # noqa: E402


def _extract_factory_presets():
    text = (ROOT / "web" / "x2hdr_viewer.js").read_text(encoding="utf-8")
    marker = "const FACTORY_PRESETS = {"
    start = text.index(marker) + len("const FACTORY_PRESETS = ")
    depth = 0
    end = start
    for index, char in enumerate(text[start:], start):
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                end = index + 1
                break

    source = text[start:end]
    source = re.sub(r"(\n\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:", r'\1"\2":', source)
    source = source.replace("'", '"')
    return eval(source, {"__builtins__": {}})


def _hdr_scene(kind, width=192, height=128):
    y = torch.linspace(0.0, 1.0, height).reshape(height, 1)
    x = torch.linspace(0.0, 1.0, width).reshape(1, width)
    base = (x * 0.7 + y * 0.3).clamp(0.0, 1.0)
    if kind == "normal":
        lum = 0.02 * torch.pow(160.0, base)
    elif kind == "low_key":
        lum = 0.003 * torch.pow(45.0, base)
    elif kind == "high_key":
        lum = 0.12 * torch.pow(55.0, base)
    else:
        raise ValueError(kind)

    color = torch.stack(
        (
            lum * (1.0 + 0.18 * x),
            lum * (0.92 + 0.12 * y),
            lum * (0.84 + 0.16 * (1.0 - x)),
        ),
        dim=-1,
    )
    if kind == "normal":
        color[20:34, 132:154, :] = torch.tensor([8.0, 7.2, 5.8])
    return color.unsqueeze(0).float()


def _metrics(image):
    rgb = image[..., :3].float().reshape(-1, 3)
    luma = rgb @ torch.tensor([0.2126, 0.7152, 0.0722])
    return {
        "finite": bool(torch.isfinite(rgb).all()),
        "p01": float(torch.quantile(luma, 0.01)),
        "p50": float(torch.quantile(luma, 0.50)),
        "p95": float(torch.quantile(luma, 0.95)),
        "p99": float(torch.quantile(luma, 0.99)),
        "clip": float((rgb >= 0.995).float().mean()),
        "black": float((luma <= 0.006).float().mean()),
        "mean_sat": float(
            (
                (rgb.max(dim=1).values - rgb.min(dim=1).values)
                / rgb.max(dim=1).values.clamp(min=1e-6)
            ).mean()
        ),
    }


def _check_preset(name, params):
    scenes = {kind: _hdr_scene(kind) for kind in ("normal", "low_key", "high_key")}
    failures = []
    for scene_name, hdr in scenes.items():
        display = grade_display(hdr, _grade_params_from_mapping(params))
        metrics = _metrics(display)
        if not metrics["finite"]:
            failures.append(f"{scene_name}: non-finite output")
        if metrics["clip"] > 0.18:
            failures.append(f"{scene_name}: clipping too high ({metrics['clip']:.3f})")
        if scene_name != "low_key" and metrics["p50"] < 0.045:
            failures.append(f"{scene_name}: median too dark ({metrics['p50']:.3f})")
        normal_bright_limit = 0.78 if params.get("tone_map") == "AgX" else 0.74
        if scene_name == "normal" and metrics["p50"] > normal_bright_limit:
            failures.append(f"{scene_name}: median too bright ({metrics['p50']:.3f})")
        if scene_name == "low_key" and metrics["p50"] > 0.68:
            failures.append(f"{scene_name}: median too bright ({metrics['p50']:.3f})")
        if metrics["black"] > 0.50:
            failures.append(f"{scene_name}: crushed blacks too high ({metrics['black']:.3f})")
        if metrics["mean_sat"] > 0.95:
            failures.append(f"{scene_name}: saturation too high ({metrics['mean_sat']:.3f})")
    return failures


def main():
    presets = _extract_factory_presets()
    if not presets:
        raise SystemExit("No factory presets found")

    failures = {}
    for name, params in presets.items():
        preset_failures = _check_preset(name, params)
        if preset_failures:
            failures[name] = preset_failures

    if failures:
        for name, preset_failures in failures.items():
            print(name)
            for failure in preset_failures:
                print(f"  - {failure}")
        raise SystemExit(1)

    print(f"Preset QA passed for {len(presets)} factory presets")


if __name__ == "__main__":
    main()
