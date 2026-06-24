from dataclasses import dataclass

import torch


@dataclass
class GradeParams:
    exposure: float = 0.0
    auto_exposure: bool = False
    auto_exposure_lock: bool = False
    auto_exposure_ev: float = 0.0
    tone_mapping: str = "ACES Fitted"
    soft_clip: float = 0.0
    temperature: float = 0.0
    tint: float = 0.0
    lift: tuple[float, float, float] = (0.0, 0.0, 0.0)
    gamma: tuple[float, float, float] = (1.0, 1.0, 1.0)
    gain: tuple[float, float, float] = (1.0, 1.0, 1.0)
    offset: tuple[float, float, float] = (0.0, 0.0, 0.0)
    contrast: float = 1.0
    pivot: float = 0.18
    shadows: float = 0.0
    highlights: float = 0.0
    saturation: float = 1.0
    vibrance: float = 0.0
    hue_shift: float = 0.0
    color_matrix: tuple[float, float, float, float, float, float, float, float, float] = (
        1.0,
        0.0,
        0.0,
        0.0,
        1.0,
        0.0,
        0.0,
        0.0,
        1.0,
    )
    density: float = 0.0
    black_lift: float = 0.0
    shadow_tone: tuple[float, float, float] = (0.0, 0.0, 0.0)
    highlight_tone: tuple[float, float, float] = (0.0, 0.0, 0.0)
    tone_balance: float = 0.5
    false_color: bool = False


@dataclass
class ExposureInfo:
    auto_ev: float = 0.0
    bias_ev: float = 0.0
    final_ev: float = 0.0
    auto_enabled: bool = False
    auto_locked: bool = False


TONE_MAPS = ["None", "Reinhard", "ACES Fitted", "AgX", "Hable"]
LUMA = torch.tensor([0.2126, 0.7152, 0.0722], dtype=torch.float32)


def _linear_to_srgb(c: torch.Tensor) -> torch.Tensor:
    lo = c * 12.92
    hi = 1.055 * torch.pow(c.clamp(min=1e-10), 1.0 / 2.4) - 0.055
    return torch.where(c <= 0.0031308, lo, hi)


def _luma(c: torch.Tensor) -> torch.Tensor:
    weights = LUMA.to(device=c.device, dtype=c.dtype)
    return torch.sum(c[..., :3] * weights, dim=-1, keepdim=True)


def _rgb_to_hsv(c: torch.Tensor) -> torch.Tensor:
    r, g, b = c.unbind(dim=-1)
    maxc = torch.max(c, dim=-1).values
    minc = torch.min(c, dim=-1).values
    delta = maxc - minc

    hue = torch.zeros_like(maxc)
    safe_delta = torch.where(delta == 0, torch.ones_like(delta), delta)
    hue = torch.where(maxc == r, ((g - b) / safe_delta) % 6.0, hue)
    hue = torch.where(maxc == g, ((b - r) / safe_delta) + 2.0, hue)
    hue = torch.where(maxc == b, ((r - g) / safe_delta) + 4.0, hue)
    hue = hue / 6.0
    sat = torch.where(maxc == 0, torch.zeros_like(maxc), delta / maxc.clamp(min=1e-10))
    return torch.stack((hue, sat, maxc), dim=-1)


def _hsv_to_rgb(hsv: torch.Tensor) -> torch.Tensor:
    h, s, v = hsv.unbind(dim=-1)
    h6 = (h % 1.0) * 6.0
    i = torch.floor(h6).to(torch.int64)
    f = h6 - i.to(h6.dtype)
    p = v * (1.0 - s)
    q = v * (1.0 - s * f)
    t = v * (1.0 - s * (1.0 - f))

    i = i % 6
    rgb = torch.stack((v, t, p), dim=-1)
    rgb = torch.where((i == 1).unsqueeze(-1), torch.stack((q, v, p), dim=-1), rgb)
    rgb = torch.where((i == 2).unsqueeze(-1), torch.stack((p, v, t), dim=-1), rgb)
    rgb = torch.where((i == 3).unsqueeze(-1), torch.stack((p, q, v), dim=-1), rgb)
    rgb = torch.where((i == 4).unsqueeze(-1), torch.stack((t, p, v), dim=-1), rgb)
    rgb = torch.where((i == 5).unsqueeze(-1), torch.stack((v, p, q), dim=-1), rgb)
    return rgb


def _aces_fitted(x: torch.Tensor) -> torch.Tensor:
    a = 2.51
    b = 0.03
    c = 2.43
    d = 0.59
    e = 0.14
    return (x * (a * x + b)) / (x * (c * x + d) + e)


def _agx(x: torch.Tensor) -> torch.Tensor:
    x = torch.log2(x.clamp(min=1e-6))
    x = torch.clamp((x + 12.47393) / 16.5, 0.0, 1.0)
    y = 15.5 * x**6 - 40.14 * x**5 + 31.96 * x**4 - 6.868 * x**3 + 0.4298 * x**2 + 0.1191 * x - 0.00232
    return torch.clamp(y, 0.0, 1.0)


def _hable(x: torch.Tensor) -> torch.Tensor:
    a = 0.15
    b = 0.50
    c = 0.10
    d = 0.20
    e = 0.02
    f = 0.30
    w = 11.2

    def curve(v: torch.Tensor) -> torch.Tensor:
        return ((v * (a * v + c * b) + d * e) / (v * (a * v + b) + d * f)) - e / f

    return curve(x) / curve(torch.tensor(w, device=x.device, dtype=x.dtype))


def _false_color(c: torch.Tensor) -> torch.Tensor:
    c = torch.nan_to_num(c.float(), nan=0.0, posinf=0.0, neginf=0.0).clamp(min=0.0)
    lum = torch.log2(_luma(c).squeeze(-1).clamp(min=1e-6) / 0.18)
    stops = torch.clamp((lum + 6.0) / 12.0, 0.0, 1.0)
    anchors = torch.tensor(
        [
            [0.0, 0.0, 0.45],
            [0.0, 0.55, 1.0],
            [0.0, 0.7, 0.25],
            [0.9, 0.9, 0.2],
            [1.0, 0.45, 0.0],
            [1.0, 0.0, 0.0],
        ],
        device=c.device,
        dtype=c.dtype,
    )
    pos = stops * (anchors.shape[0] - 1)
    idx0 = torch.floor(pos).to(torch.int64).clamp(0, anchors.shape[0] - 1)
    idx1 = (idx0 + 1).clamp(0, anchors.shape[0] - 1)
    t = (pos - idx0.to(pos.dtype)).unsqueeze(-1)
    return torch.clamp(anchors[idx0] * (1.0 - t) + anchors[idx1] * t, 0.0, 1.0)


def _soft_clip(c: torch.Tensor, amount: float) -> torch.Tensor:
    amount = float(amount)
    if amount <= 0.0:
        return c
    knee = max(1.0 - amount, 1e-4)
    above = c > knee
    compressed = knee + (1.0 - knee) * (1.0 - torch.exp(-(c - knee) / (1.0 - knee)))
    return torch.where(above, compressed, c)


def _apply_midtone_gamma(c: torch.Tensor, gamma: torch.Tensor, pivot: float) -> torch.Tensor:
    pivot = max(float(pivot), 1e-6)
    gamma = gamma.clamp(min=0.1, max=4.0)
    normalized = c / (c + pivot)
    adjusted = torch.pow(normalized.clamp(0.0, 1.0), 1.0 / gamma)
    ratio = adjusted / normalized.clamp(min=1e-6)
    mid_weight = torch.clamp(4.0 * normalized * (1.0 - normalized), 0.0, 1.0)
    ratio = 1.0 + (ratio - 1.0) * mid_weight
    ratio = ratio.clamp(0.02, 8.0)
    return torch.where(c > 0.0, c * ratio, c)


def _apply_chroma_scale(c: torch.Tensor, lum: torch.Tensor, scale) -> torch.Tensor:
    scale = torch.as_tensor(scale, device=c.device, dtype=c.dtype)
    chroma = c - lum
    min_chroma = chroma.min(dim=-1, keepdim=True).values
    max_scale = lum / (-min_chroma).clamp(min=1e-6)
    safe_scale = torch.where(scale > 1.0, torch.minimum(scale, max_scale), scale)
    return lum + chroma * safe_scale


def _compute_auto_exposure_stops(c: torch.Tensor) -> torch.Tensor:
    lum = _luma(c).squeeze(-1)
    flat = lum.reshape(lum.shape[0], -1) if lum.ndim == 3 else lum.reshape(1, -1)
    if flat.shape[1] > 262144:
        step = max(1, flat.shape[1] // 262144)
        flat = flat[:, ::step]
    flat_cpu = flat.float().cpu()
    q = torch.tensor([0.02, 0.10, 0.25, 0.50, 0.75, 0.90, 0.95, 0.99], dtype=torch.float32)
    quantiles = torch.quantile(flat_cpu, q, dim=1).to(device=c.device, dtype=c.dtype)

    shape = (-1,) + (1,) * (c.ndim - 1)
    p02, p10, p25, p50, p75, p90, p95, p99 = [v.reshape(shape).clamp(min=1e-5) for v in quantiles]
    log_flat = torch.log2(flat_cpu.clamp(min=1e-5))
    log_average = torch.pow(
        torch.tensor(2.0, device=c.device, dtype=c.dtype),
        log_flat.mean(dim=1).to(device=c.device, dtype=c.dtype).reshape(shape),
    ).clamp(min=1e-5)

    dynamic_range = torch.log2(p95 / p10).clamp(min=0.0)
    specular_ratio = torch.log2(p99 / p90).clamp(min=0.0)
    specular_weight = ((specular_ratio - 1.25) / 2.75).clamp(0.0, 1.0)
    low_key_weight = ((torch.log2(torch.tensor(0.14, device=c.device, dtype=c.dtype) / p50)) / 2.0).clamp(0.0, 1.0)
    high_key_weight = ((torch.log2(p50 / torch.tensor(0.34, device=c.device, dtype=c.dtype))) / 1.5).clamp(0.0, 1.0)

    mid_target = torch.lerp(
        torch.full_like(p50, 0.18),
        torch.full_like(p50, 0.23),
        low_key_weight * (1.0 - specular_weight * 0.55),
    )
    mid_target = torch.lerp(mid_target, torch.full_like(p50, 0.16), high_key_weight)
    high_target = torch.lerp(torch.full_like(p90, 1.05), torch.full_like(p90, 1.45), specular_weight)
    high_meter = torch.lerp(p95, p90, specular_weight)

    mid_stops = torch.log2(mid_target / p50)
    key_stops = torch.log2(torch.full_like(log_average, 0.18) / log_average)
    high_stops = torch.log2(high_target / high_meter)
    shadow_stops = torch.log2(torch.full_like(p10, 0.035) / p10)

    tonal_stops = mid_stops * 0.68 + key_stops * 0.22 + shadow_stops * 0.10
    highlight_weight = ((dynamic_range - 2.4) / 3.0).clamp(0.20, 0.72) * (1.0 - specular_weight * 0.65)
    stops = tonal_stops * (1.0 - highlight_weight) + high_stops * highlight_weight

    max_brighten = high_stops + 1.15 + specular_weight * 1.35
    max_darken = shadow_stops - 1.00
    stops = torch.minimum(stops, max_brighten)
    stops = torch.maximum(stops, max_darken)
    stops = stops.clamp(-3.5, 3.5)
    return stops


def _input_exposure(c: torch.Tensor, params: GradeParams) -> tuple[torch.Tensor, ExposureInfo]:
    batch = int(c.shape[0]) if c.ndim == 4 else 1
    shape = (batch,) + (1,) * (c.ndim - 1)
    if params.auto_exposure:
        if params.auto_exposure_lock:
            auto_stops = torch.full(
                shape,
                float(params.auto_exposure_ev),
                device=c.device,
                dtype=c.dtype,
            ).clamp(-3.5, 3.5)
        else:
            auto_stops = _compute_auto_exposure_stops(c)
    else:
        auto_stops = torch.zeros(shape, device=c.device, dtype=c.dtype)

    bias_stops = torch.full_like(auto_stops, float(params.exposure))
    final_stops = (auto_stops + bias_stops).clamp(-10.0, 10.0)
    scale = torch.pow(torch.tensor(2.0, device=c.device, dtype=c.dtype), final_stops)
    info = ExposureInfo(
        auto_ev=float(auto_stops.flatten()[0].detach().cpu()),
        bias_ev=float(bias_stops.flatten()[0].detach().cpu()),
        final_ev=float(final_stops.flatten()[0].detach().cpu()),
        auto_enabled=bool(params.auto_exposure),
        auto_locked=bool(params.auto_exposure and params.auto_exposure_lock),
    )
    return c * scale, info


def grade_linear_with_info(hdr: torch.Tensor, params: GradeParams) -> tuple[torch.Tensor, ExposureInfo]:
    c = torch.nan_to_num(hdr[..., :3].float(), nan=0.0, posinf=0.0, neginf=0.0)
    c = torch.clamp(c, min=0.0)
    c, exposure_info = _input_exposure(c, params)

    wb = torch.tensor(
        [
            1.0 + float(params.temperature) * 0.45,
            1.0 + float(params.tint) * 0.35,
            1.0 - float(params.temperature) * 0.45,
        ],
        device=c.device,
        dtype=c.dtype,
    )
    c = c * wb.clamp(min=0.01)

    lum = _luma(c)
    offset = torch.tensor(params.offset, device=c.device, dtype=c.dtype)
    lift = torch.tensor(params.lift, device=c.device, dtype=c.dtype)
    gain = torch.tensor(params.gain, device=c.device, dtype=c.dtype)
    gamma = torch.tensor(params.gamma, device=c.device, dtype=c.dtype)
    pivot = max(float(params.pivot), 1e-6)

    c = c + offset
    c = c + lift * (1.0 - lum * 2.0).clamp(0.0, 1.0)
    c = c * gain
    c = _apply_midtone_gamma(c.clamp(min=0.0), gamma, pivot)

    c = (c - pivot) * float(params.contrast) + pivot
    c = torch.clamp(c, min=0.0)

    lum = _luma(c)
    shadow_w = 1.0 / (1.0 + torch.exp(12.0 * (lum - 0.3)))
    highlight_w = 1.0 / (1.0 + torch.exp(-12.0 * (lum - 0.6)))
    c = c + float(params.shadows) * shadow_w * 0.15
    c = c + float(params.highlights) * highlight_w * 0.15
    c = torch.clamp(c, min=0.0)

    lum = _luma(c)
    matrix = torch.tensor(params.color_matrix, device=c.device, dtype=c.dtype).reshape(3, 3)
    if torch.max(torch.abs(matrix - torch.eye(3, device=c.device, dtype=c.dtype))) > 0.0001:
        c = torch.matmul(c, matrix.transpose(0, 1))
        c = torch.clamp(c, min=0.0)
        lum = _luma(c)

    if abs(float(params.black_lift)) > 0.001:
        black_w = (1.0 / (1.0 + torch.exp(18.0 * (lum - 0.12)))).clamp(0.0, 1.0)
        c = c + float(params.black_lift) * black_w
        c = torch.clamp(c, min=0.0)
        lum = _luma(c)

    if abs(float(params.density)) > 0.001:
        density = float(params.density)
        c = _apply_chroma_scale(c, lum, 1.0 + density * 0.35)
        c = c * (1.0 - density * 0.08)
        c = torch.clamp(c, min=0.0)
        lum = _luma(c)

    shadow_tone = torch.tensor(params.shadow_tone, device=c.device, dtype=c.dtype)
    highlight_tone = torch.tensor(params.highlight_tone, device=c.device, dtype=c.dtype)
    if torch.max(torch.abs(shadow_tone)) > 0.0001 or torch.max(torch.abs(highlight_tone)) > 0.0001:
        balance = float(params.tone_balance)
        shadow_center = 0.22 + (balance - 0.5) * 0.18
        highlight_center = 0.58 + (balance - 0.5) * 0.18
        shadow_w = 1.0 / (1.0 + torch.exp(14.0 * (lum - shadow_center)))
        highlight_w = 1.0 / (1.0 + torch.exp(-14.0 * (lum - highlight_center)))
        c = c + shadow_tone * shadow_w + highlight_tone * highlight_w
        c = torch.clamp(c, min=0.0)
        lum = _luma(c)

    if abs(float(params.vibrance)) > 0.001:
        vibrance = float(params.vibrance)
        rgb_max = c.max(dim=-1, keepdim=True).values.clamp(min=1e-6)
        chroma = c.max(dim=-1, keepdim=True).values - c.min(dim=-1, keepdim=True).values
        relative_chroma = (chroma / rgb_max).clamp(0.0, 1.0)
        if vibrance > 0.0:
            factor = 1.0 + vibrance * 0.45 * (1.0 - relative_chroma) ** 1.35
        else:
            factor = 1.0 + vibrance * 0.45 * (0.35 + relative_chroma * 0.65)
        factor = factor.clamp(0.08, 2.25)
        c = _apply_chroma_scale(c, lum, factor)

    c = _apply_chroma_scale(c, lum, max(float(params.saturation), 0.0))
    c = torch.clamp(c, min=0.0)

    if abs(float(params.hue_shift)) > 0.001:
        hsv = _rgb_to_hsv(c)
        hsv = torch.stack(
            (
                (hsv[..., 0] + float(params.hue_shift) / 360.0) % 1.0,
                hsv[..., 1],
                hsv[..., 2],
            ),
            dim=-1,
        )
        c = _hsv_to_rgb(hsv)

    return torch.clamp(c, min=0.0).contiguous(), exposure_info


def grade_linear(hdr: torch.Tensor, params: GradeParams) -> torch.Tensor:
    return grade_linear_with_info(hdr, params)[0]


def grade_display_with_info(hdr: torch.Tensor, params: GradeParams) -> tuple[torch.Tensor, ExposureInfo]:
    if params.false_color:
        info = ExposureInfo(
            bias_ev=float(params.exposure),
            final_ev=float(params.exposure),
            auto_enabled=bool(params.auto_exposure),
            auto_locked=bool(params.auto_exposure and params.auto_exposure_lock),
        )
        return _false_color(hdr[..., :3].float()).contiguous(), info

    c, exposure_info = grade_linear_with_info(hdr, params)
    method = params.tone_mapping
    if method == "Reinhard":
        c = c / (1.0 + c)
    elif method == "ACES Fitted":
        c = _aces_fitted(c)
    elif method == "AgX":
        c = _agx(c)
    elif method == "Hable":
        c = _hable(c)
    elif method != "None":
        raise ValueError(f"Unsupported tone mapping: {method}")

    c = _soft_clip(torch.clamp(c, min=0.0), params.soft_clip)
    display = torch.clamp(_linear_to_srgb(torch.clamp(c, 0.0, 1.0)), 0.0, 1.0).contiguous()
    return display, exposure_info


def grade_display(hdr: torch.Tensor, params: GradeParams) -> torch.Tensor:
    return grade_display_with_info(hdr, params)[0]
