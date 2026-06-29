# ComfyUI X2HDR

English | [中文](README_zh.md)

Self-contained ComfyUI custom nodes for generic X2HDR/PU21 workflows. The package inverse-decodes PU21 model output into linear HDR RGB, writes float OpenEXR files, provides a built-in interactive HDR color-grading viewer, creates tone-mapped previews, and reports HDR metrics.

## Nodes

- `X2HDR PU21 Decode`: inverse-decodes X2HDR PU21 model output into linear float HDR RGB and returns decode metrics.
- `X2HDR Save EXR`: saves linear HDR images as `.exr` files and returns the sanitized HDR tensor for downstream nodes.
- `X2HDR Color Grade`: grades linear HDR, outputs both display LDR and linear HDR, and opens the built-in interactive grading viewer.
- `X2HDR Tone Map Preview`: creates ACES, Reinhard, or log LDR previews.
- `X2HDR Metrics`: returns luminance and RGB statistics as JSON.
- `X2HDR Dynamic Range QA`: checks whether decoded HDR exceeds SDR/VAE range and creates a `-4/-2/0/+2/+4 EV` exposure preview strip.

## Why This Exists

X2HDR training stores HDR images in PU21 space before VAE encoding:

```text
EXR linear HDR
-> scale_to_l_peak
-> PU21 encode [0, 1]
-> VAE input
```

A PNG or JPG saved directly after `VAE Decode` is only a PU21-space preview, not a real linear HDR image. The correct inference path is:

```text
X2HDR model or LoRA
-> VAE Decode
-> X2HDR PU21 Decode
-> X2HDR Save EXR
-> X2HDR Color Grade
-> Save Image preview PNG, or X2HDR Save EXR for graded HDR
```

## Installation

Place this folder under:

```text
ComfyUI/custom_nodes/comfyui-x2hdr
```

Then restart ComfyUI. The nodes appear under:

```text
image/HDR/X2HDR
```

## Minimal Extra Dependencies

ComfyUI already provides the base runtime used by these nodes, including `torch`, `numpy`, `Pillow`, `aiohttp`, and the ComfyUI server modules. To avoid duplicating ComfyUI dependencies, this package only declares extra libraries that are not assumed to come from ComfyUI:

- `av`

`av` is used for OpenEXR writing. `opencv-python` is optional and only used as a fallback if PyAV cannot write EXR in the current environment.

## Typical Workflow

1. Connect your model's `VAE Decode` `IMAGE` output to `X2HDR PU21 Decode`.
2. Send `hdr_image` to `X2HDR Dynamic Range QA` to verify that the result contains useful HDR range.
3. Save the decoded linear image with `X2HDR Save EXR`.
4. Use `X2HDR Color Grade` for display rendering or creative adjustment.
5. Save `graded_display` with normal `Save Image`, or save `graded_linear` with `X2HDR Save EXR` if you need graded HDR output.

An example workflow scaffold is included at:

```text
examples/x2hdr_text2image.json
```

## Decode Defaults

```text
input_range = 0_1
apply_l_peak = true
l_peak = 4000
target_luminance = 16
target_percentile = 99.5
clamp_pu21 = true
```

Set `target_luminance` to `0` to disable percentile normalization and preserve the decoded scale. Use `input_range = minus1_1` only when the upstream tensor is centered in `[-1, 1]` instead of `[0, 1]`.

## Interactive HDR Color Grade

Run `X2HDR Color Grade` once, then click `Open X2HDR color grade` on the node.

The built-in viewer is implemented inside this package and does not depend on any third-party ComfyUI plugin. It keeps the HDR tensor cached on the ComfyUI server and requests tone-mapped preview frames while you adjust grading controls.

Viewer features:

- canvas pan, zoom, fit, and 1:1 inspection
- live preview for exposure, auto exposure, tone mapping, soft clip, white balance, contrast, lift/gamma/gain/offset, shadows/highlights, saturation, vibrance, hue shift, density, black lift, split toning, color matrix, and false color
- source/graded/split comparison
- RGB histogram
- HDR and display RGB pixel sampling
- frame navigation for batched images
- factory presets plus user presets in the viewer
- `Save` writes the final values back to the node widgets
- `Save PNG` and `Save EXR` export the current viewer frame through this node package's backend routes

The node outputs:

- `graded_display`: LDR display image for preview or normal `Save Image`
- `graded_linear`: graded linear HDR image for further HDR processing or EXR export

## Output Notes

`X2HDR PU21 Decode` returns a ComfyUI `IMAGE` tensor containing float32 linear HDR values. Values greater than `1.0` are expected.

`X2HDR Save EXR` writes linear float HDR RGB without gamma correction or tone mapping. Its first output is the sanitized HDR image that was written, so it can be chained into downstream HDR nodes without re-reading the EXR.

`X2HDR Tone Map Preview` returns `preview`, `preview_aces`, `preview_reinhard`, and `preview_log`. The first output follows the selected `method`. The `all` method still returns ACES as the first output while exposing all three named preview outputs.

`X2HDR Metrics` returns JSON for per-frame luminance and RGB statistics.

## Dynamic Range QA

Connect decoded HDR to `X2HDR Dynamic Range QA` to confirm that the output is not just an SDR-range image in a float tensor. It reports `max_rgb`, luminance percentiles, highlight headroom in stops, dynamic range in stops, and whether the image exceeds the SDR reference. It also creates a `-4/-2/0/+2/+4 EV` preview strip so highlight and shadow recoverability can be inspected visually.

`verdict = pass` means every frame passes all three checks:

- `max_rgb > sdr_reference` or `lum_p995 > sdr_reference`
- `hdr_headroom_p995_stops >= headroom_threshold_stops`
- `dynamic_range_p995_over_positive_p01_stops >= dynamic_range_threshold_stops`

`verdict = review` means at least one frame failed a check. Inspect `review_reasons`, per-frame metrics, and the exposure strip.

## Validation

For parity testing, compare a known PU21 tensor against the reference HDR decode path using the same `l_peak`, `target_luminance`, and percentile settings.

Suggested tolerance:

```text
max_abs_error < 1e-4
mean_abs_error < 1e-5
```

Local smoke tests are available under `tests/`. From this folder, run the scripts with the same Python environment used by ComfyUI, for example:

```text
python tests/decode_l_peak_smoke.py
python tests/dynamic_range_qa_smoke.py
python tests/auto_exposure_smoke.py
python tests/cache_smoke.py
python tests/preset_qa.py
```
