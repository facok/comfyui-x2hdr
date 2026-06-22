import math
import os
from fractions import Fraction
from typing import Any

import av
import numpy as np
import torch


os.environ.setdefault("OPENCV_IO_ENABLE_OPENEXR", "1")


PU21_A = 0.001908
PU21_B = 0.0078
L_MIN = 0.005
L_MAX = 10000.0
L_MIN_LOG2 = math.log2(L_MIN)
EPSILON = 1.0e-6
LUMINANCE_WEIGHTS = torch.tensor([0.2126, 0.7152, 0.0722], dtype=torch.float32)


def image_to_pu21(image: torch.Tensor, input_range: str, clamp_pu21: bool = True) -> torch.Tensor:
    """Convert a ComfyUI IMAGE-like tensor into PU21 values."""
    if not isinstance(image, torch.Tensor):
        raise TypeError("image must be a torch.Tensor")

    pu21 = image.to(dtype=torch.float32)
    if input_range == "minus1_1":
        pu21 = (pu21 + 1.0) * 0.5
    elif input_range != "0_1":
        raise ValueError(f"Unsupported input_range: {input_range}")

    if pu21.ndim != 4:
        raise ValueError(f"Expected a 4D image tensor, got shape {tuple(pu21.shape)}")

    # ComfyUI IMAGE is NHWC. This also accepts raw NCHW tensors for direct checks.
    if pu21.shape[-1] not in (1, 3, 4) and pu21.shape[1] in (1, 3, 4):
        pu21 = pu21.movedim(1, -1)

    if pu21.shape[-1] == 1:
        pu21 = pu21.repeat_interleave(3, dim=-1)
    elif pu21.shape[-1] > 3:
        pu21 = pu21[..., :3]

    if pu21.shape[-1] != 3:
        raise ValueError(f"Expected an RGB image tensor, got shape {tuple(pu21.shape)}")

    if clamp_pu21:
        pu21 = torch.clamp(pu21, 0.0, 1.0)
    return pu21


def pu21_decode(pu21: torch.Tensor, clamp_pu21: bool = True) -> torch.Tensor:
    """Inverse PU21 decode into linear luminance-like HDR values."""
    v = pu21.to(dtype=torch.float32)
    if clamp_pu21:
        v = torch.clamp(v, 0.0, 1.0)

    discriminant = PU21_B * PU21_B + 4.0 * PU21_A * v
    exponent = (
        2.0 * PU21_A * L_MIN_LOG2
        - PU21_B
        + torch.sqrt(torch.clamp(discriminant, min=0.0))
    ) / (2.0 * PU21_A)
    return torch.clamp(torch.pow(2.0, exponent), L_MIN, L_MAX)


def luminance(hdr: torch.Tensor) -> torch.Tensor:
    weights = LUMINANCE_WEIGHTS.to(device=hdr.device, dtype=hdr.dtype)
    return torch.sum(hdr[..., :3] * weights, dim=-1)


def apply_luminance_normalization(
    hdr: torch.Tensor,
    target_luminance: float,
    target_percentile: float,
) -> tuple[torch.Tensor, float]:
    if target_luminance <= 0:
        return hdr, 1.0

    lum = luminance(torch.clamp(hdr, min=0.0))
    current = percentile(lum, target_percentile)
    if current <= EPSILON:
        return hdr, 1.0

    scale = min(target_luminance / current, 1.0)
    return hdr * scale, float(scale)


def apply_batch_luminance_normalization(
    hdr: torch.Tensor,
    target_luminance: float,
    target_percentile: float,
) -> tuple[torch.Tensor, list[float]]:
    if hdr.ndim == 3:
        normalized, scale = apply_luminance_normalization(
            hdr,
            target_luminance=target_luminance,
            target_percentile=target_percentile,
        )
        return normalized, [scale]

    normalized = []
    scales = []
    for image in hdr:
        image_normalized, scale = apply_luminance_normalization(
            image,
            target_luminance=target_luminance,
            target_percentile=target_percentile,
        )
        normalized.append(image_normalized)
        scales.append(scale)
    return torch.stack(normalized, dim=0), scales


def decode_image_to_hdr(
    image: torch.Tensor,
    input_range: str = "0_1",
    apply_l_peak: bool = True,
    l_peak: float = 4000.0,
    target_luminance: float = 16.0,
    target_percentile: float = 99.5,
    clamp_pu21: bool = True,
) -> tuple[torch.Tensor, dict[str, Any]]:
    pu21 = image_to_pu21(image, input_range, clamp_pu21=clamp_pu21)
    hdr = pu21_decode(pu21, clamp_pu21=clamp_pu21)

    if apply_l_peak:
        hdr = hdr * float(l_peak)

    hdr, normalization_scales = apply_batch_luminance_normalization(
        hdr,
        target_luminance=float(target_luminance),
        target_percentile=float(target_percentile),
    )
    metrics = compute_metrics(hdr)
    metrics.update(
        {
            "l_peak": float(l_peak),
            "apply_l_peak": bool(apply_l_peak),
            "target_luminance": float(target_luminance),
            "target_percentile": float(target_percentile),
            "normalization_scales": [float(scale) for scale in normalization_scales],
        }
    )
    return hdr.contiguous(), metrics


def percentile(values: torch.Tensor, q: float) -> float:
    values = values.detach().reshape(-1)
    finite = values[torch.isfinite(values)]
    if finite.numel() == 0:
        return 0.0
    q_norm = max(0.0, min(1.0, float(q) / 100.0))
    return float(torch.quantile(finite.float().cpu(), q_norm).item())


def _safe_stop_ratio(high: float, low: float) -> float:
    if high <= EPSILON or low <= EPSILON:
        return 0.0
    return float(math.log2(high / low))


def compute_metrics(hdr: torch.Tensor) -> dict[str, Any]:
    data = hdr.detach().float()
    finite_mask = torch.isfinite(data)
    nonfinite_count = int((~finite_mask).sum().item())
    negative_count = int((data[finite_mask] < 0.0).sum().item()) if finite_mask.any() else 0

    finite_data = data[finite_mask]
    if finite_data.numel() == 0:
        min_rgb = mean_rgb = max_rgb = 0.0
    else:
        min_rgb = float(finite_data.min().item())
        mean_rgb = float(finite_data.mean().item())
        max_rgb = float(finite_data.max().item())

    finite_hdr = torch.nan_to_num(data, nan=0.0, posinf=0.0, neginf=0.0)
    lum = luminance(torch.clamp(finite_hdr, min=0.0))
    lum_p01 = percentile(lum, 1.0)
    lum_p50 = percentile(lum, 50.0)
    lum_p95 = percentile(lum, 95.0)
    lum_p995 = percentile(lum, 99.5)
    lum_max = percentile(lum, 100.0)
    lum_mean = float(lum.mean().item()) if lum.numel() else 0.0

    return {
        "min_rgb": min_rgb,
        "mean_rgb": mean_rgb,
        "max_rgb": max_rgb,
        "lum_p01": lum_p01,
        "lum_p50": lum_p50,
        "lum_p95": lum_p95,
        "lum_p995": lum_p995,
        "lum_max": lum_max,
        "lum_mean": lum_mean,
        "stops_p995_over_p01": _safe_stop_ratio(lum_p995, lum_p01),
        "stops_max_over_p01": _safe_stop_ratio(lum_max, lum_p01),
        "negative_values": negative_count,
        "nonfinite_values": nonfinite_count,
    }


def sanitize_hdr(
    hdr: torch.Tensor,
    sanitize_nonfinite: bool = True,
    clamp_negative: bool = True,
) -> torch.Tensor:
    out = hdr.detach().float().cpu()
    if sanitize_nonfinite:
        out = torch.nan_to_num(out, nan=0.0, posinf=0.0, neginf=0.0)
    if clamp_negative:
        out = torch.clamp(out, min=0.0)
    return out


def tensor_to_numpy_image(
    hdr: torch.Tensor,
    sanitize_nonfinite: bool = True,
    clamp_negative: bool = True,
) -> np.ndarray:
    clean = sanitize_hdr(
        hdr,
        sanitize_nonfinite=sanitize_nonfinite,
        clamp_negative=clamp_negative,
    )
    if clean.ndim != 3 or clean.shape[-1] != 3:
        raise ValueError(f"Expected one NHWC RGB image slice, got shape {tuple(clean.shape)}")
    return clean.numpy().astype(np.float32, copy=False)


def save_exr_image(
    hdr_image: torch.Tensor,
    path: str,
    sanitize_nonfinite: bool = True,
    clamp_negative: bool = True,
) -> None:
    rgb = tensor_to_numpy_image(
        hdr_image,
        sanitize_nonfinite=sanitize_nonfinite,
        clamp_negative=clamp_negative,
    )
    try:
        with open(path, "wb") as file:
            file.write(encode_exr_bytes(rgb))
        return
    except Exception:
        # Keep OpenCV as a fallback for environments without a working PyAV EXR codec.
        pass

    import cv2

    bgr = np.ascontiguousarray(rgb[..., ::-1])
    ok = cv2.imwrite(path, bgr)
    if not ok:
        raise RuntimeError(f"OpenCV failed to write EXR file: {path}")


def encode_exr_bytes(rgb: np.ndarray) -> bytes:
    """Encode a single RGB float32 image as OpenEXR bytes via PyAV."""
    if rgb.ndim != 3 or rgb.shape[-1] != 3:
        raise ValueError(f"Expected HWC RGB image data, got shape {rgb.shape}")

    height, width, _ = rgb.shape
    codec = av.CodecContext.create("exr", "w")
    codec.width = width
    codec.height = height
    codec.pix_fmt = "gbrpf32le"
    codec.time_base = Fraction(1, 1)

    frame = av.VideoFrame.from_ndarray(rgb, format="gbrpf32le")
    frame.pts = 0
    frame.time_base = codec.time_base
    packets = list(codec.encode(frame)) + list(codec.encode(None))
    return b"".join(bytes(packet) for packet in packets)


def _white_point_from_luminance(hdr: torch.Tensor, white_percentile: float, white_point: float) -> float:
    if white_point > 0:
        return float(white_point)
    lum = luminance(torch.clamp(hdr, min=0.0))
    return max(percentile(lum, white_percentile), EPSILON)


def _tone_map_single(
    hdr: torch.Tensor,
    method: str = "aces",
    white_percentile: float = 99.5,
    white_point: float = 0.0,
    exposure: float = 1.0,
    gamma: float = 2.2,
) -> torch.Tensor:
    if method not in ("aces", "reinhard", "log"):
        raise ValueError(f"Unsupported tone-map method: {method}")

    data = torch.nan_to_num(hdr.detach().float(), nan=0.0, posinf=0.0, neginf=0.0)
    data = torch.clamp(data, min=0.0)
    wp = _white_point_from_luminance(data, white_percentile, white_point)
    x = torch.clamp(data * float(exposure) / wp, min=0.0)

    if method == "reinhard":
        mapped = x / (1.0 + x)
    elif method == "aces":
        a = 2.51
        b = 0.03
        c = 2.43
        d = 0.59
        e = 0.14
        mapped = (x * (a * x + b)) / (x * (c * x + d) + e)
    else:
        mapped = torch.log1p(x) / math.log(2.0)

    gamma_value = max(float(gamma), EPSILON)
    mapped = torch.clamp(mapped, 0.0, 1.0)
    mapped = torch.pow(mapped, 1.0 / gamma_value)
    return mapped.contiguous()


def tone_map(
    hdr: torch.Tensor,
    method: str = "aces",
    white_percentile: float = 99.5,
    white_point: float = 0.0,
    exposure: float = 1.0,
    gamma: float = 2.2,
) -> torch.Tensor:
    if hdr.ndim == 3:
        return _tone_map_single(
            hdr,
            method=method,
            white_percentile=white_percentile,
            white_point=white_point,
            exposure=exposure,
            gamma=gamma,
        )

    previews = [
        _tone_map_single(
            image,
            method=method,
            white_percentile=white_percentile,
            white_point=white_point,
            exposure=exposure,
            gamma=gamma,
        )
        for image in hdr
    ]
    return torch.stack(previews, dim=0).contiguous()
