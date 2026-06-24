import os

from aiohttp import web
import folder_paths
import torch

from server import PromptServer

from .nodes import _get_grade_cache_entry, _grade_params_from_mapping, _image_to_png_bytes
from .grading import grade_display, grade_display_with_info, grade_linear
from .hdr_utils import save_exr_image


routes = PromptServer.instance.routes
OUTPUT_DIR = folder_paths.get_output_directory()


def _error(message, status=400):
    return web.json_response({"error": message}, status=status)


def _read_cache(data):
    cache_id = str(data.get("cache_id") or data.get("node_id") or "")
    if not cache_id:
        return None, None
    return cache_id, _get_grade_cache_entry(cache_id)


def _resize_hdr_for_preview(hdr_frame, max_size):
    try:
        max_size = int(max_size)
    except (TypeError, ValueError):
        max_size = 1536
    max_size = max(64, min(max_size, 4096))

    height = int(hdr_frame.shape[1])
    width = int(hdr_frame.shape[2])
    largest = max(width, height)
    if largest <= max_size:
        return hdr_frame

    scale = max_size / float(largest)
    out_h = max(1, int(round(height * scale)))
    out_w = max(1, int(round(width * scale)))
    nchw = hdr_frame.permute(0, 3, 1, 2)
    resized = torch.nn.functional.interpolate(
        nchw,
        size=(out_h, out_w),
        mode="bilinear",
        align_corners=False,
    )
    return resized.permute(0, 2, 3, 1).contiguous()


def _safe_output_prefix(filename_prefix, save_subfolder=""):
    prefix = str(filename_prefix or "x2hdr_grade").strip().replace("\\", "/")
    subfolder = str(save_subfolder or "").strip().replace("\\", "/")
    combined = "/".join(part for part in (subfolder, prefix) if part)
    if not combined:
        combined = "x2hdr_grade"

    normalized = os.path.normpath(combined)
    drive, _ = os.path.splitdrive(normalized)
    parts = [part for part in normalized.split(os.sep) if part and part != "."]
    if drive or os.path.isabs(normalized) or any(part == ".." for part in parts):
        raise ValueError("Save path must be relative to the ComfyUI output directory.")
    if normalized in ("", "."):
        return "x2hdr_grade"
    return normalized


def _output_path(filename_prefix, save_subfolder, width, height, extension, batch_number):
    prefix = _safe_output_prefix(filename_prefix, save_subfolder)
    full_output_folder, filename, counter, subfolder, _ = folder_paths.get_save_image_path(
        prefix,
        OUTPUT_DIR,
        width,
        height,
    )
    os.makedirs(full_output_folder, exist_ok=True)
    filename_with_batch_num = filename.replace("%batch_num%", str(batch_number))
    file = f"{filename_with_batch_num}_{counter:05}_.{extension}"
    path = os.path.join(full_output_folder, file)
    return path, file, subfolder


@routes.post("/x2hdr/grade/preview")
async def x2hdr_grade_preview(request):
    data = await request.json()
    _, entry = _read_cache(data)
    frame = int(data.get("frame", 0))
    params = _grade_params_from_mapping(data.get("params", {}))

    if entry is None:
        return _error("No cached HDR image for this node. Run X2HDR Color Grade once.", 404)

    hdr = entry.get("hdr")
    if not isinstance(hdr, torch.Tensor) or hdr.ndim != 4 or hdr.shape[0] < 1:
        return _error("Cached HDR image is invalid.", 500)

    frame = max(0, min(frame, hdr.shape[0] - 1))
    preview_hdr = _resize_hdr_for_preview(hdr[frame : frame + 1], data.get("max_size", 1536))
    display_batch, exposure_info = grade_display_with_info(preview_hdr, params)
    display = display_batch[0]
    png = _image_to_png_bytes(display)
    return web.Response(
        body=png,
        content_type="image/png",
        headers={
            "X-X2HDR-Width": str(int(hdr.shape[2])),
            "X-X2HDR-Height": str(int(hdr.shape[1])),
            "X-X2HDR-Preview-Width": str(int(display.shape[1])),
            "X-X2HDR-Preview-Height": str(int(display.shape[0])),
            "X-X2HDR-Frames": str(int(hdr.shape[0])),
            "X-X2HDR-Auto-EV": f"{exposure_info.auto_ev:.4f}",
            "X-X2HDR-Bias-EV": f"{exposure_info.bias_ev:.4f}",
            "X-X2HDR-Final-EV": f"{exposure_info.final_ev:.4f}",
            "X-X2HDR-Auto-Exposure": "1" if exposure_info.auto_enabled else "0",
            "X-X2HDR-Auto-Locked": "1" if exposure_info.auto_locked else "0",
        },
    )


@routes.post("/x2hdr/grade/info")
async def x2hdr_grade_info(request):
    data = await request.json()
    cache_id, entry = _read_cache(data)
    if entry is None:
        return _error("No cached HDR image for this node. Run X2HDR Color Grade once.", 404)
    return web.json_response(
        {
            "cache_id": cache_id,
            "frames": int(entry.get("frames", 0)),
            "width": int(entry.get("width", 0)),
            "height": int(entry.get("height", 0)),
            "channels": int(entry.get("channels", 0)),
        }
    )


@routes.post("/x2hdr/grade/sample")
async def x2hdr_grade_sample(request):
    data = await request.json()
    _, entry = _read_cache(data)
    if entry is None:
        return _error("No cached HDR image for this node. Run X2HDR Color Grade once.", 404)

    hdr = entry.get("hdr")
    if not isinstance(hdr, torch.Tensor) or hdr.ndim != 4 or hdr.shape[0] < 1:
        return _error("Cached HDR image is invalid.", 500)

    frame = max(0, min(int(data.get("frame", 0)), hdr.shape[0] - 1))
    x = max(0, min(int(round(float(data.get("x", 0)))), hdr.shape[2] - 1))
    y = max(0, min(int(round(float(data.get("y", 0)))), hdr.shape[1] - 1))
    params = _grade_params_from_mapping(data.get("params", {}))

    hdr_pixel = hdr[frame, y, x, :3].detach().float().cpu()
    display_pixel = grade_display(hdr[frame : frame + 1, y : y + 1, x : x + 1, :3], params)[
        0, 0, 0, :3
    ].detach().float().cpu()
    return web.json_response(
        {
            "frame": frame,
            "x": x,
            "y": y,
            "hdr_rgb": [float(v) for v in hdr_pixel],
            "display_rgb": [float(v) for v in display_pixel],
            "max_channel": float(torch.max(hdr_pixel)),
            "luma": float(torch.sum(hdr_pixel * torch.tensor([0.2126, 0.7152, 0.0722]))),
        }
    )


@routes.post("/x2hdr/grade/save")
async def x2hdr_grade_save(request):
    data = await request.json()
    _, entry = _read_cache(data)
    if entry is None:
        return _error("No cached HDR image for this node. Run X2HDR Color Grade once.", 404)

    hdr = entry.get("hdr")
    if not isinstance(hdr, torch.Tensor) or hdr.ndim != 4 or hdr.shape[0] < 1:
        return _error("Cached HDR image is invalid.", 500)

    frame = max(0, min(int(data.get("frame", 0)), hdr.shape[0] - 1))
    params = _grade_params_from_mapping(data.get("params", {}))
    filename_prefix = data.get("filename_prefix") or "x2hdr_grade"
    save_subfolder = data.get("save_subfolder") or ""
    export_format = str(data.get("format") or "png").lower()
    hdr_frame = hdr[frame : frame + 1]

    if export_format == "png":
        display = grade_display(hdr_frame, params)[0]
        try:
            path, file, subfolder = _output_path(
                filename_prefix,
                save_subfolder,
                int(display.shape[1]),
                int(display.shape[0]),
                "png",
                frame,
            )
        except ValueError as error:
            return _error(str(error), 400)
        with open(path, "wb") as output:
            output.write(_image_to_png_bytes(display))
    elif export_format == "exr":
        linear = grade_linear(hdr_frame, params)[0]
        try:
            path, file, subfolder = _output_path(
                filename_prefix,
                save_subfolder,
                int(linear.shape[1]),
                int(linear.shape[0]),
                "exr",
                frame,
            )
        except ValueError as error:
            return _error(str(error), 400)
        save_exr_image(linear, path, sanitize_nonfinite=True, clamp_negative=True)
    else:
        return _error("Unsupported save format. Expected png or exr.", 400)

    return web.json_response(
        {
            "format": export_format,
            "filename": file,
            "subfolder": subfolder,
            "type": "output",
            "path": path,
            "frame": frame,
        }
    )
