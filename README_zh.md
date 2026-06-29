# ComfyUI X2HDR

[English](README.md) | 中文

这是一个自包含的 ComfyUI 自定义节点包，用于通用 X2HDR/PU21 工作流。它可以把模型输出的 PU21 图像反解码为线性 HDR RGB，保存 float OpenEXR 文件，提供内置交互式 HDR 调色 viewer，生成 tone-map 预览，并输出 HDR 指标。

这是一个独立的 ComfyUI 节点包，不是 X2HDR 论文作者发布的官方实现。X2HDR 官方仓库位于：

```text
https://github.com/X2HDR/X2HDR
```

## 节点

- `X2HDR PU21 Decode`：将 X2HDR PU21 模型输出反解码为线性 float HDR RGB，并返回解码指标。
- `X2HDR Save EXR`：将线性 HDR 图像保存为 `.exr`，并返回清理后的 HDR tensor 供后续节点继续使用。
- `X2HDR Color Grade`：对线性 HDR 做调色，同时输出显示用 LDR 和线性 HDR，并打开内置交互式调色 viewer。
- `X2HDR Tone Map Preview`：生成 ACES、Reinhard 或 Log 的 LDR 预览。
- `X2HDR Metrics`：以 JSON 输出亮度和 RGB 统计指标。
- `X2HDR Dynamic Range QA`：检查解码后的 HDR 是否超过 SDR/VAE 范围，并生成 `-4/-2/0/+2/+4 EV` 曝光预览条。

## X2HDR 论文背景

X2HDR 论文 [HDR Image Generation in a Perceptually Uniform Space](https://arxiv.org/abs/2602.04814) 指出一个核心问题：HDR 图像通常以线性 RGB 表示，而现有文生图扩散模型大多在显示编码的 LDR 图像上预训练。线性 HDR 的亮度和颜色统计与 LDR 图像差异很大，直接送入 LDR 预训练 VAE 会导致重建质量明显下降。本仓库围绕这一工作流提供兼容的 ComfyUI 工具，但不是 X2HDR 官方发布；官方项目见 https://github.com/X2HDR/X2HDR。

X2HDR 的做法是先把 HDR 训练图像转换到 PU21 或 PQ 这类感知均匀空间。在 text-to-HDR 设置中，VAE 和文本编码器保持冻结，只在这个感知均匀空间中用 LoRA 微调 denoiser。推理时，`VAE Decode` 后得到的仍然是 PU21 空间中的图像表示，而不是线性 HDR。

训练侧表示可以理解为：

```text
EXR linear HDR
-> scale to target peak luminance
-> PU21 encode [0, 1]
-> VAE input
```

因此，`VAE Decode` 后不能直接用 PNG/JPG 当作最终 HDR 保存。那只是 PU21 空间预览图，不是真正的线性 HDR。正确推理链路应是：

```text
X2HDR model or LoRA
-> VAE Decode
-> X2HDR PU21 Decode
-> X2HDR Save EXR
-> X2HDR Color Grade
-> Save Image preview PNG，或用 X2HDR Save EXR 保存调色后的 HDR
```

重要：这些节点不能把普通 SDR 模型输出“转换成 HDR”。`X2HDR PU21 Decode` 只负责对已经处在 X2HDR/PU21 表示中的图像做反变换。如果上游模型或 LoRA 没有按 PU21 编码 HDR 的方式训练，直接接这个节点会得到错误的颜色和亮度，不会得到真正的 HDR。

## 安装

将本目录放到：

```text
ComfyUI/custom_nodes/comfyui-x2hdr
```

然后重启 ComfyUI。节点会出现在：

```text
image/HDR/X2HDR
```

## 最少额外依赖

ComfyUI 已经提供这些节点使用的基础运行环境，包括 `torch`、`numpy`、`Pillow`、`aiohttp` 和 ComfyUI 服务端模块。为了避免和 ComfyUI 依赖重复，本节点包只声明不假定由 ComfyUI 提供的额外库：

- `av`

`av` 用于写 OpenEXR。`opencv-python` 是可选依赖，只在当前环境里的 PyAV 无法写 EXR 时作为 fallback 使用。

## 典型工作流

1. 使用按 X2HDR/PU21 方式训练的模型或 LoRA，例如下面的 Krea2 X2HDR LoRA。
2. 将该工作流的 `VAE Decode` `IMAGE` 输出接到 `X2HDR PU21 Decode`。
3. 将 `hdr_image` 接到 `X2HDR Dynamic Range QA`，确认结果确实包含可用 HDR 范围。
4. 用 `X2HDR Save EXR` 保存解码后的线性图像。
5. 用 `X2HDR Color Grade` 做显示渲染或创意调色。
6. 用普通 `Save Image` 保存 `graded_display`，或用 `X2HDR Save EXR` 保存 `graded_linear` 作为调色后的 HDR 输出。

示例 workflow scaffold 位于：

```text
examples/x2hdr_text2image.json
```

## Krea2 X2HDR LoRA

Krea2 X2HDR LoRA 位于：

```text
https://huggingface.co/F16/x2hdr-krea2
```

可配合 Krea-2-Raw 或 Krea-2-Turbo 使用。生成后需要先将 `VAE Decode` 输出接入 `X2HDR PU21 Decode`，再保存 EXR。必须配合该类 LoRA 使用的原因是：LoRA 让 denoiser 学会输出 PU21 编码的 HDR 表示；节点本身无法从普通 LDR 模型输出中推断出 HDR 数据。

## 默认解码参数

```text
input_range = 0_1
apply_l_peak = true
l_peak = 4000
target_luminance = 16
target_percentile = 99.5
clamp_pu21 = true
```

这些默认值对应上面的 PU21 工作流：从 `[0, 1]` PU21 空间解码，应用峰值亮度尺度，然后按 ComfyUI 实用输出需求可选地整理解码尺度。如果希望尽量保留原始解码强度，可以把 `target_luminance` 设为 `0`，关闭百分位归一化。只有当上游 tensor 是 `[-1, 1]` 居中范围时，才需要使用 `input_range = minus1_1`。

## 交互式 HDR 调色 Viewer

先运行一次 `X2HDR Color Grade`，再点击节点上的 `Open X2HDR color grade`。

这个 viewer 完全由本节点包实现，不依赖任何第三方 ComfyUI 插件。它把 HDR tensor 缓存在 ComfyUI 服务端，调参时向本节点包的后端接口请求 tone-map 预览帧。

viewer 功能：

- canvas 平移、缩放、适配窗口和 1:1 检查
- 实时调整曝光、自动曝光、tone mapping、soft clip、白平衡、对比度、lift/gamma/gain/offset、阴影/高光、饱和度、vibrance、色相偏移、density、black lift、分离色调、色彩矩阵和 false color
- source / graded / split 对比
- RGB 直方图
- HDR RGB 和显示 RGB 像素采样
- 批量图像帧切换
- viewer 内置 factory presets 和用户 presets
- 点击 `Save` 后把最终参数写回节点 widgets
- `Save PNG` 和 `Save EXR` 会通过本节点包的后端接口导出当前 viewer 帧

节点输出：

- `graded_display`：用于预览或普通 `Save Image` 的 LDR 显示图。
- `graded_linear`：用于继续 HDR 处理或再次保存 EXR 的线性 HDR 图。

## 输出说明

`X2HDR PU21 Decode` 返回 ComfyUI `IMAGE` tensor，但其中包含的是 float32 线性 HDR 值。数值大于 `1.0` 是正常现象。

`X2HDR Save EXR` 保存的是线性 float HDR RGB，不做 gamma，也不做 tone-map。它的第一个输出是实际写出的、已清理的 HDR 图像，可以继续接到下游 HDR 节点，不需要重新读取 EXR。

`X2HDR Tone Map Preview` 会返回 `preview`、`preview_aces`、`preview_reinhard` 和 `preview_log`。第一个 `preview` 输出由 `method` 参数决定。`method = all` 时，第一个输出仍为 ACES，同时也会提供三个具名预览输出。

`X2HDR Metrics` 返回每帧亮度和 RGB 统计指标的 JSON。

## Dynamic Range QA

将解码后的 HDR 接到 `X2HDR Dynamic Range QA`，可以确认输出不是“装在 float tensor 里的 SDR 范围图”。它会报告 `max_rgb`、亮度百分位、高光 headroom stops、动态范围 stops，以及图像是否超过 SDR 参考值。节点还会生成 `-4/-2/0/+2/+4 EV` 预览条，方便直观看高光和阴影是否有可恢复细节。

`verdict = pass` 表示每一帧都通过以下三项检查：

- `max_rgb > sdr_reference` 或 `lum_p995 > sdr_reference`
- `hdr_headroom_p995_stops >= headroom_threshold_stops`
- `dynamic_range_p995_over_positive_p01_stops >= dynamic_range_threshold_stops`

`verdict = review` 表示至少一帧没有通过检查。此时应查看 `review_reasons`、逐帧 metrics 和曝光预览条。

## 致谢

感谢 X2HDR 作者发布论文和官方实现：

- 论文：https://arxiv.org/abs/2602.04814
- 官方仓库：https://github.com/X2HDR/X2HDR

## 验证建议

如需和参考 HDR decode 链路对齐，可以使用同一个 PU21 tensor，并保持 `l_peak`、`target_luminance`、`target_percentile` 一致。

建议误差标准：

```text
max_abs_error < 1e-4
mean_abs_error < 1e-5
```
