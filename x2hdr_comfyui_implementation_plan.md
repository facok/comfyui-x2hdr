# X2HDR ComfyUI Implementation Plan

## 目标

在 ComfyUI 中完整支持通用 X2HDR/PU21 模型或 LoRA 推理，使生成结果可以从模型输出的 PU21 编码图正确恢复为线性 HDR，并保存为 EXR，同时提供可视化 tone-map 预览和基础 HDR 指标。

核心目标不是只让图片“看起来能显示”，而是保证训练、ai-toolkit sample、ComfyUI 推理三者的 HDR 解码逻辑一致。

## 背景判断

X2HDR 训练链路中，HDR EXR 图像会先被缩放到 `hdr_l_peak`，再做 PU21 encode，最后映射到 VAE 输入范围：

```text
EXR linear HDR
-> scale_to_l_peak(l_peak=4000)
-> PU21 encode [0, 1]
-> VAE input [-1, 1]
```

因此推理输出不能当普通 LDR 图像直接保存。正确推理链路应该是：

```text
X2HDR model or LoRA
-> VAE decode
-> decoded [-1, 1] or ComfyUI IMAGE [0, 1]
-> PU21 inverse decode
-> linear HDR RGB
-> optional luminance normalization
-> save EXR
-> optional tone-map PNG preview
```

如果没有 inverse PU21 节点，ComfyUI 保存出来的 PNG/JPG 只是 PU21 编码空间的预览图，不是真正 HDR。

## 必要节点

### 1. X2HDR PU21 Decode

这是必须节点。

功能：

- 将 VAE decoded image/tensor 转为 PU21 `[0, 1]`。
- 对 PU21 做 inverse decode，恢复线性 HDR RGB。
- 可选执行 `l_peak` 重标定。
- 可选执行 `target_luminance` 归一化。

建议节点名：

```text
X2HDR PU21 Decode
```

输入：

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `image` | `IMAGE` | required | ComfyUI VAE Decode 后的图像，通常是 `[0,1]` |
| `input_range` | enum | `0_1` | 可选 `0_1` / `minus1_1` |
| `apply_l_peak` | bool | `true` | 是否缩放到 `l_peak` |
| `l_peak` | float | `4000.0` | 与训练 `hdr_l_peak` 保持一致 |
| `target_luminance` | float | `16.0` | 将指定百分位亮度压到该值；设为 `0` 表示关闭 |
| `target_percentile` | float | `99.5` | 推荐 `99.5` |
| `clamp_pu21` | bool | `true` | 将 PU21 输入 clamp 到 `[0,1]` |

输出：

| 输出 | 类型 | 说明 |
| --- | --- | --- |
| `hdr_image` | `IMAGE` 或自定义 `HDR_IMAGE` | float32 linear HDR |
| `metrics` | `DICT` | HDR 指标，供日志或显示使用 |

实现公式：

```python
PU21_A = 0.001908
PU21_B = 0.0078
L_MIN = 0.005
L_MAX = 10000.0
L_MIN_LOG2 = log2(L_MIN)

def pu21_decode(v):
    v = clip(v, 0.0, 1.0)
    discriminant = PU21_B * PU21_B + 4 * PU21_A * v
    exponent = (
        2 * PU21_A * L_MIN_LOG2
        - PU21_B
        + sqrt(discriminant)
    ) / (2 * PU21_A)
    return clip(2.0 ** exponent, L_MIN, L_MAX)
```

ComfyUI `IMAGE` 常见格式是 `NHWC float32 [0,1]`。如果接入的是 ai-toolkit 原始 decoded tensor，则可能是 `NCHW [-1,1]`，所以节点必须提供 `input_range` 参数。

### 2. X2HDR Save EXR

这是 HDR 工作流必须节点。

功能：

- 保存 `float32 linear HDR RGB` 为 `.exr`。
- 保持 RGB 线性值，不做 gamma，不做 tone-map。
- 输出保存路径。

建议节点名：

```text
X2HDR Save EXR
```

输入：

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `hdr_image` | `IMAGE` 或 `HDR_IMAGE` | required | PU21 decode 后的线性 HDR |
| `filename_prefix` | string | `x2hdr` | 输出文件名前缀 |
| `output_dir` | string | ComfyUI output | 保存目录 |
| `format` | enum | `exr_float32` | 初期只实现 EXR float32 |
| `sanitize_nonfinite` | bool | `true` | NaN/Inf 转 0 |
| `clamp_negative` | bool | `true` | 负值转 0 |

注意：

- OpenCV 写 EXR 时需要 BGR 顺序。
- 需要设置环境变量：

```python
os.environ["OPENCV_IO_ENABLE_OPENEXR"] = "1"
```

### 3. X2HDR Tone Map Preview

这是强烈建议节点，用来判断效果。

功能：

- 将 linear HDR 转为 LDR PNG 预览。
- 支持 `reinhard` / `aces` / `log`。
- 支持 `all` 一次输出三种预览。

建议节点名：

```text
X2HDR Tone Map Preview
```

输入：

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `hdr_image` | `IMAGE` 或 `HDR_IMAGE` | required | linear HDR |
| `method` | enum | `aces` | `reinhard` / `aces` / `log` / `all` |
| `white_percentile` | float | `99.5` | 用指定亮度百分位作为 white point |
| `white_point` | float | `0.0` | 大于 0 时覆盖 percentile white point |
| `exposure` | float | `1.0` | tone-map 前曝光倍率 |
| `gamma` | float | `2.2` | 输出 gamma |

输出：

| 输出 | 类型 | 说明 |
| --- | --- | --- |
| `preview` | `IMAGE` | tone-mapped LDR preview |
| `preview_aces` | `IMAGE` | 当 `method=all` 时输出 |
| `preview_reinhard` | `IMAGE` | 当 `method=all` 时输出 |
| `preview_log` | `IMAGE` | 当 `method=all` 时输出 |

建议默认使用 `aces` 作为主预览，但保留 `all` 模式，因为不同场景判断不同：

- `aces`: 更接近摄影/电影观感，适合主观判断。
- `reinhard`: 压高光稳定，适合看过曝风险。
- `log`: 更容易看暗部和宽动态范围分布。

### 4. X2HDR Metrics

这是建议节点，用于判断训练或推理是否有效。

建议节点名：

```text
X2HDR Metrics
```

输出指标：

| 指标 | 说明 |
| --- | --- |
| `min_rgb` | RGB 最小值 |
| `mean_rgb` | RGB 均值 |
| `max_rgb` | RGB 最大值 |
| `lum_p01` | 亮度 1% 分位 |
| `lum_p50` | 亮度中位数 |
| `lum_p95` | 亮度 95% 分位 |
| `lum_p995` | 亮度 99.5% 分位 |
| `lum_max` | 最大亮度 |
| `lum_mean` | 平均亮度 |
| `stops_p995_over_p01` | p99.5 相对 p1 的档位差 |
| `stops_max_over_p01` | max 相对 p1 的档位差 |
| `negative_values` | 负值数量 |
| `nonfinite_values` | NaN/Inf 数量 |

## 推荐自定义节点包结构

建议单独做一个 ComfyUI custom node repo：

```text
ComfyUI-X2HDR/
  __init__.py
  nodes.py
  hdr_utils.py
  pyproject.toml
  README.md
  examples/
    x2hdr_text2image.json
```

其中：

- `hdr_utils.py`: PU21 decode、tone-map、metrics、EXR 保存。
- `nodes.py`: ComfyUI 节点定义。
- `__init__.py`: 导出 `NODE_CLASS_MAPPINGS` 和 `NODE_DISPLAY_NAME_MAPPINGS`。
- `examples/`: 保存可直接导入 ComfyUI 的 workflow。

## 节点实现细节

### 数据格式

ComfyUI 标准 `IMAGE` 通常为：

```text
torch.Tensor
shape: [batch, height, width, channels]
range: [0, 1]
dtype: float32
```

ai-toolkit 内部 VAE decoded tensor 为：

```text
torch.Tensor
shape: [batch, channels, height, width]
range: [-1, 1]
```

节点实现应优先兼容 ComfyUI 标准 `IMAGE`，并用 `input_range` 支持 `minus1_1`：

```python
if input_range == "minus1_1":
    pu21 = (image + 1.0) / 2.0
else:
    pu21 = image

pu21 = torch.clamp(pu21, 0.0, 1.0)
```

### l_peak 和 target_luminance 的区别

`l_peak=4000` 是与训练尺度一致的 HDR 绝对亮度重标定。

`target_luminance=16` 是输出/预览阶段的归一化策略。它会把 `target_percentile`，默认 p99.5，压到 16，并且只向下缩放：

```python
scale = min(target_luminance / current_luminance, 1.0)
hdr = hdr * scale
```

推荐默认：

```text
l_peak = 4000
target_luminance = 16
target_percentile = 99.5
```

如果用户想保留更原始的 HDR 强度，可以把 `target_luminance` 设为 `0` 或关闭。

### EXR 保存

EXR 保存应使用 float32：

```python
image = hdr.detach().cpu().numpy().astype(np.float32)
image = np.nan_to_num(image, nan=0.0, posinf=0.0, neginf=0.0)
image = np.maximum(image, 0.0)
bgr = image[..., ::-1]
cv2.imwrite(path, bgr)
```

### Tone-map 实现

white point 默认由亮度百分位计算：

```python
luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
white_point = percentile(luminance, white_percentile)
normalized = hdr / max(white_point, 1e-6)
```

Reinhard：

```python
mapped = normalized / (1.0 + normalized)
```

ACES filmic：

```python
a = 2.51
b = 0.03
c = 2.43
d = 0.59
e = 0.14
mapped = (x * (a * x + b)) / (x * (c * x + d) + e)
```

Log：

```python
mapped = log1p(normalized) / log(2.0)
```

最后：

```python
mapped = clamp(mapped, 0.0, 1.0)
mapped = mapped ** (1.0 / gamma)
```

## 推荐 ComfyUI Workflow

基础 text2image HDR workflow：

```text
Load X2HDR-capable Model
-> Load X2HDR LoRA
-> Text Encode
-> Sampler
-> VAE Decode
-> X2HDR PU21 Decode
-> X2HDR Save EXR
-> X2HDR Tone Map Preview
-> Save Image preview PNG
```

如果上游模型节点已经在 VAE Decode 后强制转 PNG 或 clamp 到 LDR，需要改造模型节点，让它暴露 VAE decoded float image，不能只给 PIL/uint8 图像。

## 参数默认值

建议与 ai-toolkit 当前 sample 逻辑保持一致：

```yaml
x2hdr:
  input_range: "0_1"
  l_peak: 4000.0
  target_luminance: 16.0
  target_percentile: 99.5
  tone_map: "all"
  tone_map_white_percentile: 99.5
  tone_map_gamma: 2.2
  tone_map_exposure: 1.0
  save_exr: true
  save_metrics: true
```

## 验证方案

### 1. 公式一致性验证

用 ai-toolkit 中同一张 sample 的 VAE decoded tensor 或 PU21 image，对比：

- ai-toolkit `decoded_tensor_to_hdr_image()`
- ComfyUI `X2HDR PU21 Decode`

验收标准：

```text
max_abs_error < 1e-4
mean_abs_error < 1e-5
```

### 2. EXR 可读性验证

保存 EXR 后，用 OpenCV 或 Nuke/Blender 读取：

检查：

- 文件可读。
- RGB 为 float32。
- 没有 NaN/Inf。
- 亮度分位数合理。

### 3. 与 ai-toolkit sample 对齐

使用同一模型、同一 LoRA、同一 seed、同一 prompt、同一 sampler 参数：

```text
sample_steps = 20
guidance_scale = 3
width = 1024
height = 1024
seed = 42
l_peak = 4000
target_luminance = 16
target_percentile = 99.5
```

验收标准：

- EXR 指标接近。
- tone-map preview 观感接近。
- p99.5 接近 `16`，如果启用 target luminance。
- `negative_values = 0`
- `nonfinite_values = 0`

### 4. 用户可视化验证

至少准备 4 类 prompt：

- 夜景霓虹和湿地反射。
- 室内强窗光和深阴影。
- 直射阳光和金属高光。
- 暗场火焰/爆炸。

不要只用 `overcast / low contrast / soft light` prompt 判断 HDR，因为这类 prompt 本身会让 tone-map preview 看起来发灰。

## 开发步骤

### 阶段 1：最小可用

实现：

- `X2HDR PU21 Decode`
- `X2HDR Save EXR`
- `X2HDR Tone Map Preview`

完成后即可在 ComfyUI 保存真正 HDR EXR。

### 阶段 2：指标和调试

实现：

- `X2HDR Metrics`
- 保存 CSV 或在节点 UI 中显示关键指标。
- 支持输出 `lum_p50 / lum_p95 / lum_p995 / lum_max / stops`。

### 阶段 3：Workflow 示例

提供：

- `examples/x2hdr_text2image.json`
- README 中写明参数含义。
- 截图或示例输出说明 EXR 与 preview 的区别。

### 阶段 4：与上游模型节点深度集成

如果现有 ComfyUI 上游模型节点无法暴露 VAE decoded float image，需要改造：

- 在 VAE Decode 后保留 float tensor。
- 不要在 PU21 decode 前转 uint8。
- 不要在 PU21 decode 前套 sRGB gamma。
- 不要提前 clamp 成 LDR。

## 风险点

1. 普通 ComfyUI `SaveImage` 不能保存 HDR，只能保存 LDR preview。
2. 如果上游节点已经把 VAE 输出转成 uint8，PU21 信息会丢失，无法恢复 HDR。
3. `target_luminance=16` 会让 p99.5 固定接近 16，因此不能用它单独判断训练成功。
4. 不同 tone-map 方法观感差异很大，评估时至少看 ACES、Reinhard、Log 三种。
5. 如果 ComfyUI 使用不同 sampler、scheduler、CFG、seed 处理方式，不能期待与 ai-toolkit sample 像素级一致。

## 最终验收标准

ComfyUI 支持完成后，应满足：

- 可以加载 X2HDR 模型或 LoRA 生成图像。
- 可以从 VAE decoded image 正确 inverse PU21。
- 可以保存 linear HDR `.exr`。
- 可以生成 ACES/Reinhard/Log tone-map preview。
- 可以输出 HDR metrics。
- 与 ai-toolkit sample 在同参数下得到接近的亮度统计。
- 离线环境可用，不依赖网络下载。
