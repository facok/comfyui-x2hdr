import json
import os
from io import BytesIO

import folder_paths
import numpy as np
import torch
from PIL import Image

from .grading import GradeParams, TONE_MAPS as COLOR_GRADE_TONE_MAPS, grade_display, grade_linear
from .hdr_utils import (
    compute_metrics,
    decode_image_to_hdr,
    save_exr_image,
    tone_map,
)


INPUT_RANGE_OPTIONS = ["0_1", "minus1_1"]
TONE_MAP_METHODS = ["aces", "reinhard", "log", "all"]
X2HDR_GRADE_CACHE = {}
MAX_GRADE_CACHE_ITEMS = 16


def _save_preview_pngs(images, filename_prefix):
    output_dir = folder_paths.get_temp_directory()
    full_output_folder, filename, counter, subfolder, _ = folder_paths.get_save_image_path(
        filename_prefix,
        output_dir,
        images[0].shape[1],
        images[0].shape[0],
    )
    results = []
    for batch_number, image in enumerate(images):
        arr = (image.detach().cpu().clamp(0.0, 1.0).numpy() * 255.0).astype(np.uint8)
        preview = Image.fromarray(arr, "RGB")
        filename_with_batch_num = filename.replace("%batch_num%", str(batch_number))
        file = f"{filename_with_batch_num}_{counter:05}_.png"
        preview.save(os.path.join(full_output_folder, file), compress_level=4)
        results.append({"filename": file, "subfolder": subfolder, "type": "temp"})
        counter += 1
    return results


def _image_to_png_bytes(image):
    arr = (image[..., :3].detach().cpu().clamp(0.0, 1.0).numpy() * 255.0).astype(np.uint8)
    output = BytesIO()
    Image.fromarray(arr, "RGB").save(output, format="PNG", compress_level=4)
    return output.getvalue()


def _grade_params_from_mapping(params):
    return GradeParams(
        exposure=float(params.get("exposure", 0.0)),
        tone_mapping=str(params.get("tone_map", "ACES Fitted")),
        soft_clip=float(params.get("soft_clip", 0.0)),
        temperature=float(params.get("temperature", 0.0)),
        tint=float(params.get("tint", 0.0)),
        lift=(
            float(params.get("lift_r", 0.0)),
            float(params.get("lift_g", 0.0)),
            float(params.get("lift_b", 0.0)),
        ),
        gamma=(
            float(params.get("gamma_r", 1.0)),
            float(params.get("gamma_g", 1.0)),
            float(params.get("gamma_b", 1.0)),
        ),
        gain=(
            float(params.get("gain_r", 1.0)),
            float(params.get("gain_g", 1.0)),
            float(params.get("gain_b", 1.0)),
        ),
        offset=(
            float(params.get("offset_r", 0.0)),
            float(params.get("offset_g", 0.0)),
            float(params.get("offset_b", 0.0)),
        ),
        contrast=float(params.get("contrast", 1.0)),
        pivot=float(params.get("pivot", 0.18)),
        shadows=float(params.get("shadows", 0.0)),
        highlights=float(params.get("highlights", 0.0)),
        saturation=float(params.get("saturation", 1.0)),
        vibrance=float(params.get("vibrance", 0.0)),
        hue_shift=float(params.get("hue_shift", 0.0)),
        false_color=bool(params.get("false_color", False)),
    )


def _remember_grade_source(unique_id, hdr_image):
    if unique_id is None:
        return
    key = str(unique_id)
    hdr = hdr_image.detach().float().cpu().contiguous()
    X2HDR_GRADE_CACHE[key] = {
        "cache_id": key,
        "hdr": hdr,
        "frames": int(hdr.shape[0]) if hdr.ndim == 4 else 0,
        "height": int(hdr.shape[1]) if hdr.ndim == 4 else 0,
        "width": int(hdr.shape[2]) if hdr.ndim == 4 else 0,
        "channels": int(hdr.shape[3]) if hdr.ndim == 4 else 0,
    }
    while len(X2HDR_GRADE_CACHE) > MAX_GRADE_CACHE_ITEMS:
        oldest_key = next(iter(X2HDR_GRADE_CACHE))
        X2HDR_GRADE_CACHE.pop(oldest_key, None)


def _get_grade_cache_entry(cache_id):
    entry = X2HDR_GRADE_CACHE.get(str(cache_id))
    if entry is None:
        return None
    if isinstance(entry, torch.Tensor):
        hdr = entry
        return {
            "cache_id": str(cache_id),
            "hdr": hdr,
            "frames": int(hdr.shape[0]) if hdr.ndim == 4 else 0,
            "height": int(hdr.shape[1]) if hdr.ndim == 4 else 0,
            "width": int(hdr.shape[2]) if hdr.ndim == 4 else 0,
            "channels": int(hdr.shape[3]) if hdr.ndim == 4 else 0,
        }
    return entry


def _grade_cache_metadata(unique_id, hdr_image):
    cache_id = "" if unique_id is None else str(unique_id)
    if hdr_image.ndim != 4:
        return {
            "cache_id": cache_id,
            "node_id": cache_id,
            "frames": 0,
            "width": 0,
            "height": 0,
            "channels": 0,
        }
    return {
        "cache_id": cache_id,
        "node_id": cache_id,
        "frames": int(hdr_image.shape[0]),
        "width": int(hdr_image.shape[2]),
        "height": int(hdr_image.shape[1]),
        "channels": int(hdr_image.shape[3]),
    }


class X2HDRPU21Decode:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
                "input_range": (INPUT_RANGE_OPTIONS, {"default": "0_1"}),
                "apply_l_peak": ("BOOLEAN", {"default": True}),
                "l_peak": ("FLOAT", {"default": 4000.0, "min": 0.0, "max": 100000.0, "step": 1.0}),
                "target_luminance": ("FLOAT", {"default": 16.0, "min": 0.0, "max": 100000.0, "step": 0.1}),
                "target_percentile": ("FLOAT", {"default": 99.5, "min": 0.0, "max": 100.0, "step": 0.1}),
                "clamp_pu21": ("BOOLEAN", {"default": True}),
            }
        }

    RETURN_TYPES = ("IMAGE", "STRING")
    RETURN_NAMES = ("hdr_image", "metrics_json")
    FUNCTION = "decode"
    CATEGORY = "image/HDR/X2HDR"
    DESCRIPTION = "Inverse-decodes Ideogram4 X2HDR PU21 output into linear float HDR RGB."

    def decode(
        self,
        image,
        input_range,
        apply_l_peak,
        l_peak,
        target_luminance,
        target_percentile,
        clamp_pu21,
    ):
        hdr, metrics = decode_image_to_hdr(
            image,
            input_range=input_range,
            apply_l_peak=apply_l_peak,
            l_peak=l_peak,
            target_luminance=target_luminance,
            target_percentile=target_percentile,
            clamp_pu21=clamp_pu21,
        )
        metrics_json = json.dumps(metrics, indent=2, sort_keys=True)
        return (hdr, metrics_json)


class X2HDRSaveEXR:
    def __init__(self):
        self.output_dir = folder_paths.get_output_directory()
        self.type = "output"

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "hdr_image": ("IMAGE",),
                "filename_prefix": ("STRING", {"default": "x2hdr"}),
                "sanitize_nonfinite": ("BOOLEAN", {"default": True}),
                "clamp_negative": ("BOOLEAN", {"default": True}),
            },
            "hidden": {
                "prompt": "PROMPT",
                "extra_pnginfo": "EXTRA_PNGINFO",
            },
        }

    RETURN_TYPES = ("IMAGE", "STRING")
    RETURN_NAMES = ("hdr_image", "exr_paths")
    FUNCTION = "save"
    OUTPUT_NODE = True
    CATEGORY = "image/HDR/X2HDR"
    DESCRIPTION = "Saves linear float HDR RGB images as OpenEXR files in the ComfyUI output directory."

    def save(
        self,
        hdr_image,
        filename_prefix="x2hdr",
        sanitize_nonfinite=True,
        clamp_negative=True,
        prompt=None,
        extra_pnginfo=None,
    ):
        full_output_folder, filename, counter, subfolder, _ = folder_paths.get_save_image_path(
            filename_prefix,
            self.output_dir,
            hdr_image[0].shape[1],
            hdr_image[0].shape[0],
        )

        clean_hdr = hdr_image.detach().float()
        if sanitize_nonfinite:
            clean_hdr = torch.nan_to_num(clean_hdr, nan=0.0, posinf=0.0, neginf=0.0)
        if clamp_negative:
            clean_hdr = torch.clamp(clean_hdr, min=0.0)
        clean_hdr = clean_hdr.contiguous()

        results = []
        saved_paths = []
        for batch_number, image in enumerate(clean_hdr):
            filename_with_batch_num = filename.replace("%batch_num%", str(batch_number))
            file = f"{filename_with_batch_num}_{counter:05}_.exr"
            path = os.path.join(full_output_folder, file)
            save_exr_image(
                image,
                path,
                sanitize_nonfinite=sanitize_nonfinite,
                clamp_negative=clamp_negative,
            )
            results.append({"filename": file, "subfolder": subfolder, "type": self.type})
            saved_paths.append(path)
            counter += 1

        exr_paths = "\n".join(saved_paths)
        return {
            "ui": {"images": results},
            "result": (clean_hdr, exr_paths),
        }


class X2HDRToneMapPreview:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "hdr_image": ("IMAGE",),
                "method": (TONE_MAP_METHODS, {"default": "aces"}),
                "white_percentile": ("FLOAT", {"default": 99.5, "min": 0.0, "max": 100.0, "step": 0.1}),
                "white_point": ("FLOAT", {"default": 0.0, "min": 0.0, "max": 100000.0, "step": 0.1}),
                "exposure": ("FLOAT", {"default": 1.0, "min": 0.001, "max": 1000.0, "step": 0.01}),
                "gamma": ("FLOAT", {"default": 2.2, "min": 0.1, "max": 8.0, "step": 0.01}),
            }
        }

    RETURN_TYPES = ("IMAGE", "IMAGE", "IMAGE", "IMAGE")
    RETURN_NAMES = ("preview", "preview_aces", "preview_reinhard", "preview_log")
    FUNCTION = "preview"
    CATEGORY = "image/HDR/X2HDR"
    DESCRIPTION = "Tone-maps linear HDR into LDR previews using ACES, Reinhard, or log mapping."

    def preview(self, hdr_image, method, white_percentile, white_point, exposure, gamma):
        aces = tone_map(
            hdr_image,
            method="aces",
            white_percentile=white_percentile,
            white_point=white_point,
            exposure=exposure,
            gamma=gamma,
        )
        reinhard = tone_map(
            hdr_image,
            method="reinhard",
            white_percentile=white_percentile,
            white_point=white_point,
            exposure=exposure,
            gamma=gamma,
        )
        log_preview = tone_map(
            hdr_image,
            method="log",
            white_percentile=white_percentile,
            white_point=white_point,
            exposure=exposure,
            gamma=gamma,
        )

        if method == "reinhard":
            selected = reinhard
        elif method == "log":
            selected = log_preview
        else:
            selected = aces

        return (selected, aces, reinhard, log_preview)


class X2HDRColorGrade:
    @classmethod
    def INPUT_TYPES(cls):
        f = lambda default, min_value, max_value, step=0.01: (
            "FLOAT",
            {"default": default, "min": min_value, "max": max_value, "step": step},
        )
        return {
            "required": {
                "hdr_image": ("IMAGE",),
                "exposure": f(0.0, -10.0, 10.0, 0.1),
                "tone_map": (COLOR_GRADE_TONE_MAPS, {"default": "ACES Fitted"}),
                "soft_clip": f(0.0, 0.0, 1.0),
                "temperature": f(0.0, -1.0, 1.0),
                "tint": f(0.0, -1.0, 1.0),
                "lift_r": f(0.0, -1.0, 1.0),
                "lift_g": f(0.0, -1.0, 1.0),
                "lift_b": f(0.0, -1.0, 1.0),
                "gamma_r": f(1.0, 0.1, 4.0),
                "gamma_g": f(1.0, 0.1, 4.0),
                "gamma_b": f(1.0, 0.1, 4.0),
                "gain_r": f(1.0, 0.0, 4.0),
                "gain_g": f(1.0, 0.0, 4.0),
                "gain_b": f(1.0, 0.0, 4.0),
                "offset_r": f(0.0, -1.0, 1.0),
                "offset_g": f(0.0, -1.0, 1.0),
                "offset_b": f(0.0, -1.0, 1.0),
                "contrast": f(1.0, 0.0, 4.0),
                "pivot": f(0.18, 0.001, 4.0, 0.001),
                "shadows": f(0.0, -2.0, 2.0),
                "highlights": f(0.0, -2.0, 2.0),
                "saturation": f(1.0, 0.0, 3.0),
                "vibrance": f(0.0, -2.0, 2.0),
                "hue_shift": f(0.0, -180.0, 180.0, 1.0),
                "false_color": ("BOOLEAN", {"default": False}),
            },
            "hidden": {"unique_id": "UNIQUE_ID"},
        }

    RETURN_TYPES = ("IMAGE", "IMAGE")
    RETURN_NAMES = ("graded_display", "graded_linear")
    FUNCTION = "grade"
    CATEGORY = "image/HDR/X2HDR"
    DESCRIPTION = "Grades linear HDR RGB and outputs an LDR display preview plus pre-tonemap linear HDR."

    def grade(
        self,
        hdr_image,
        exposure,
        tone_map,
        soft_clip,
        temperature,
        tint,
        lift_r,
        lift_g,
        lift_b,
        gamma_r,
        gamma_g,
        gamma_b,
        gain_r,
        gain_g,
        gain_b,
        offset_r,
        offset_g,
        offset_b,
        contrast,
        pivot,
        shadows,
        highlights,
        saturation,
        vibrance,
        hue_shift,
        false_color,
        unique_id=None,
    ):
        params = _grade_params_from_mapping(
            {
                "exposure": exposure,
                "tone_map": tone_map,
                "soft_clip": soft_clip,
                "temperature": temperature,
                "tint": tint,
                "lift_r": lift_r,
                "lift_g": lift_g,
                "lift_b": lift_b,
                "gamma_r": gamma_r,
                "gamma_g": gamma_g,
                "gamma_b": gamma_b,
                "gain_r": gain_r,
                "gain_g": gain_g,
                "gain_b": gain_b,
                "offset_r": offset_r,
                "offset_g": offset_g,
                "offset_b": offset_b,
                "contrast": contrast,
                "pivot": pivot,
                "shadows": shadows,
                "highlights": highlights,
                "saturation": saturation,
                "vibrance": vibrance,
                "hue_shift": hue_shift,
                "false_color": false_color,
            }
        )
        _remember_grade_source(unique_id, hdr_image)
        graded_linear = grade_linear(hdr_image, params)
        graded_display = grade_display(hdr_image, params)
        previews = _save_preview_pngs(graded_display, "x2hdr_grade")
        viewer = [_grade_cache_metadata(unique_id, hdr_image)]
        return {
            "ui": {"images": previews, "x2hdr_viewer": viewer},
            "result": (graded_display, graded_linear),
        }


class X2HDRMetrics:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"hdr_image": ("IMAGE",)}}

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("metrics_json",)
    FUNCTION = "metrics"
    CATEGORY = "image/HDR/X2HDR"
    DESCRIPTION = "Computes luminance and RGB statistics for a linear HDR image tensor."

    def metrics(self, hdr_image):
        metrics = compute_metrics(hdr_image)
        metrics_json = json.dumps(metrics, indent=2, sort_keys=True)
        return (metrics_json,)


NODE_CLASS_MAPPINGS = {
    "X2HDRPU21Decode": X2HDRPU21Decode,
    "X2HDRSaveEXR": X2HDRSaveEXR,
    "X2HDRToneMapPreview": X2HDRToneMapPreview,
    "X2HDRColorGrade": X2HDRColorGrade,
    "X2HDRMetrics": X2HDRMetrics,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "X2HDRPU21Decode": "X2HDR PU21 Decode",
    "X2HDRSaveEXR": "X2HDR Save EXR",
    "X2HDRToneMapPreview": "X2HDR Tone Map Preview",
    "X2HDRColorGrade": "X2HDR Color Grade",
    "X2HDRMetrics": "X2HDR Metrics",
}
