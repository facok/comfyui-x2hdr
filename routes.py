from aiohttp import web
import torch

from server import PromptServer

from .nodes import _get_grade_cache_entry, _grade_params_from_mapping, _image_to_png_bytes
from .grading import grade_display


routes = PromptServer.instance.routes


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
    display = grade_display(preview_hdr, params)[0]
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
