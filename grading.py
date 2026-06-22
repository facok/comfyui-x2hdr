from dataclasses import dataclass

import torch


@dataclass
class GradeParams:
    exposure: float = 0.0
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
    false_color: bool = False


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


def grade_linear(hdr: torch.Tensor, params: GradeParams) -> torch.Tensor:
    c = torch.nan_to_num(hdr[..., :3].float(), nan=0.0, posinf=0.0, neginf=0.0)
    c = torch.clamp(c, min=0.0)
    c = c * (2.0 ** float(params.exposure))

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
    gamma = torch.tensor(params.gamma, device=c.device, dtype=c.dtype).clamp(min=0.01)

    c = c + offset
    c = c + lift * (1.0 - lum * 2.0).clamp(0.0, 1.0)
    c = c * gain
    c = torch.pow(c.clamp(min=0.0), 1.0 / gamma)

    pivot = max(float(params.pivot), 1e-6)
    c = (c - pivot) * float(params.contrast) + pivot
    c = torch.clamp(c, min=0.0)

    lum = _luma(c)
    shadow_w = 1.0 / (1.0 + torch.exp(12.0 * (lum - 0.3)))
    highlight_w = 1.0 / (1.0 + torch.exp(-12.0 * (lum - 0.6)))
    c = c + float(params.shadows) * shadow_w * 0.15
    c = c + float(params.highlights) * highlight_w * 0.15
    c = torch.clamp(c, min=0.0)

    lum = _luma(c)
    if abs(float(params.vibrance)) > 0.001:
        chroma = c.max(dim=-1, keepdim=True).values - c.min(dim=-1, keepdim=True).values
        boost = (1.0 - chroma * 2.0) * float(params.vibrance)
        c = lum + (c - lum) * (1.0 + boost)

    c = lum + (c - lum) * float(params.saturation)
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

    return torch.clamp(c, min=0.0).contiguous()


def grade_display(hdr: torch.Tensor, params: GradeParams) -> torch.Tensor:
    if params.false_color:
        return _false_color(hdr[..., :3].float()).contiguous()

    c = grade_linear(hdr, params)
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
    return torch.clamp(_linear_to_srgb(torch.clamp(c, 0.0, 1.0)), 0.0, 1.0).contiguous()
