import sys
import types
from pathlib import Path

import torch

ROOT = Path(__file__).resolve().parents[1]
COMFY_ROOT = ROOT.parents[1]
for path in (COMFY_ROOT, ROOT.parent):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

PACKAGE_NAME = "x2hdr_cache_smoke_package"
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

from x2hdr_cache_smoke_package.nodes import _grade_params_from_mapping  # noqa: E402
from x2hdr_cache_smoke_package.routes import (  # noqa: E402
    _cached_auto_exposure_ev,
    _lock_cached_auto_exposure,
    _preview_cache_key,
    _sanitize_preview_max_size,
)


def main():
    hdr = torch.linspace(0.01, 4.0, 64 * 64 * 3).reshape(1, 64, 64, 3)
    entry = {}
    ev1 = _cached_auto_exposure_ev(entry, 0, hdr)
    ev2 = _cached_auto_exposure_ev(entry, 0, hdr * 10.0)
    if ev1 != ev2:
        raise SystemExit("auto exposure cache did not reuse the cached frame EV")

    params = _grade_params_from_mapping({"auto_exposure": True, "auto_exposure_lock": False})
    was_locked = _lock_cached_auto_exposure(entry, 0, hdr, params)
    if not was_locked or not params.auto_exposure_lock:
        raise SystemExit("auto exposure params were not locked to cached EV")

    key1 = _preview_cache_key(0, _sanitize_preview_max_size("512"), params, ui_auto_locked=False)
    key2 = _preview_cache_key(0, 512, params, ui_auto_locked=False)
    if key1 != key2:
        raise SystemExit("preview cache key is not stable for sanitized max_size")

    locked_key = _preview_cache_key(0, 512, params, ui_auto_locked=True)
    if locked_key == key1:
        raise SystemExit("preview cache key must preserve UI auto-exposure lock state")

    if _sanitize_preview_max_size("bad") != 1536:
        raise SystemExit("invalid max_size should fall back to 1536")

    print("Cache smoke passed")


if __name__ == "__main__":
    main()
