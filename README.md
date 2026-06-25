# ComfyUI X2HDR

English | [中文](README_zh.md)

Self-contained ComfyUI custom nodes for generic X2HDR/PU21 workflows. The package decodes PU21 model output into linear HDR RGB, writes float OpenEXR files, provides a built-in interactive HDR color grading viewer, creates tone-mapped previews, and reports HDR metrics.

## Nodes

- `X2HDR PU21 Decode`: inverse-decodes X2HDR PU21 model output into linear float HDR RGB.
- `X2HDR Save EXR`: saves decoded HDR images as `.exr` files and returns the sanitized HDR tensor for downstream nodes.
- `X2HDR Color Grade`: grades linear HDR, returns LDR/HDR outputs, and opens the built-in interactive grading viewer.
- `X2HDR Tone Map Preview`: creates ACES, Reinhard, or log LDR previews.
- `X2HDR Metrics`: returns luminance and RGB statistics as JSON.
- `X2HDR Dynamic Range QA`: reports whether decoded HDR exceeds the SDR/VAE range and creates a multi-exposure preview strip.

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

## Requirements

The ComfyUI portable Python used here already includes the required runtime packages:

- `torch`
- `numpy`
- `PIL`
- `av`
- `opencv-python` fallback for EXR writing only

`X2HDR Save EXR` uses PyAV first, matching ComfyUI's advanced image export path. OpenCV is only a fallback.

## Interactive HDR Color Grade

Run `X2HDR Color Grade` once, then click `Open X2HDR color grade` on the node.

The built-in viewer is implemented inside this package and does not depend on any third-party ComfyUI plugin. It keeps the HDR tensor cached on the ComfyUI server and requests tone-mapped preview frames while you adjust grading controls.

Viewer features:

- canvas pan, zoom, fit, and 1:1 inspection
- live preview for exposure, tone mapping, white balance, contrast, lift/gamma/gain/offset, shadows/highlights, saturation, vibrance, hue shift, and false color
- source/graded/split comparison
- RGB histogram
- HDR and display RGB pixel sampling
- frame navigation for batched images
- `Save` writes the final values back to the node widgets

The node outputs:

- `graded_display`: LDR display image for preview or normal `Save Image`
- `graded_linear`: graded linear HDR image for further HDR processing or EXR export

## Decode Defaults

```text
input_range = 0_1
apply_l_peak = true
l_peak = 4000
target_luminance = 16
target_percentile = 99.5
clamp_pu21 = true
```

Set `target_luminance` to `0` to disable percentile normalization and preserve the decoded scale.

## Output Notes

`X2HDR PU21 Decode` returns a ComfyUI `IMAGE` tensor containing float32 linear HDR values. Values greater than `1.0` are expected.

`X2HDR Save EXR` writes linear float HDR RGB without gamma correction or tone mapping. Its first output is the sanitized HDR image that was written, so it can be chained into downstream HDR nodes without re-reading the EXR.

`X2HDR Tone Map Preview` returns `preview`, `preview_aces`, `preview_reinhard`, and `preview_log`. The first output follows the selected `method`.

An example scaffold is included at:

```text
examples/x2hdr_text2image.json
```

## Validation

For parity testing, compare a known PU21 tensor against the reference HDR decode path using the same `l_peak`, `target_luminance`, and percentile settings.

Suggested tolerance:

```text
max_abs_error < 1e-4
mean_abs_error < 1e-5
```

For dynamic-range validation, connect decoded HDR to `X2HDR Dynamic Range QA`. It reports `max_rgb`, luminance percentiles, highlight headroom in stops, dynamic range in stops, and whether the image exceeds the SDR reference. It also creates a `-4/-2/0/+2/+4 EV` preview strip so highlight and shadow recoverability can be inspected visually.

`verdict = pass` means every frame passes all three checks:

- `max_rgb > sdr_reference` or `lum_p995 > sdr_reference`
- `hdr_headroom_p995_stops >= headroom_threshold_stops`
- `dynamic_range_p995_over_positive_p01_stops >= dynamic_range_threshold_stops`

`verdict = review` means at least one frame failed a check. Inspect `review_reasons`, per-frame metrics, and the exposure strip.
