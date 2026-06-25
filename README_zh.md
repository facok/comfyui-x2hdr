# ComfyUI X2HDR

[English](README.md) | 中文

这是一个自包含的 ComfyUI 自定义节点包，用于通用 X2HDR/PU21 工作流。它可以把模型输出的 PU21 图像还原为线性 HDR RGB，保存 float OpenEXR 文件，提供内置交互式 HDR 调色 viewer，生成 tone-map 预览，并输出 HDR 指标。

## 节点

- `X2HDR PU21 Decode`：将 X2HDR PU21 模型输出反解码为线性 float HDR RGB。
- `X2HDR Save EXR`：将解码后的 HDR 图像保存为 `.exr`，并返回清理后的 HDR tensor 供后续节点继续使用。
- `X2HDR Color Grade`：对线性 HDR 做调色，输出 LDR/HDR 结果，并打开内置交互式调色 viewer。
- `X2HDR Tone Map Preview`：生成 ACES、Reinhard 或 Log 的 LDR 预览。
- `X2HDR Metrics`：以 JSON 输出亮度和 RGB 统计指标。

## 为什么需要这些节点

X2HDR 训练链路中，HDR 图像不是直接作为普通 LDR 图像训练，而是先进入 PU21 编码空间：

```text
EXR linear HDR
-> scale_to_l_peak
-> PU21 encode [0, 1]
-> VAE input
```

因此，`VAE Decode` 后不能直接用 PNG/JPG 当作最终 HDR 保存。那只是 PU21 空间预览图，不是真正的线性 HDR。正确链路应是：

```text
X2HDR model or LoRA
-> VAE Decode
-> X2HDR PU21 Decode
-> X2HDR Save EXR
-> X2HDR Color Grade
-> Save Image preview PNG，或用 X2HDR Save EXR 保存调色后的 HDR
```

## 安装

将本目录放到：

```text
ComfyUI/custom_nodes/comfyui-x2hdr
```

然后重启 ComfyUI。节点会出现在：

```text
image/HDR/X2HDR
```

## 依赖

当前 ComfyUI portable Python 环境通常已经包含需要的运行包：

- `torch`
- `numpy`
- `PIL`
- `av`
- `opencv-python`，仅作为 EXR 写入 fallback

`X2HDR Save EXR` 优先使用 PyAV 写 EXR，和 ComfyUI 的高级图像导出路径一致。OpenCV 只作为备用路径。

## 交互式 HDR 调色 Viewer

先运行一次 `X2HDR Color Grade`，再点击节点上的 `Open X2HDR color grade`。

这个 viewer 完全由本节点包实现，不依赖任何第三方 ComfyUI 插件。它把 HDR tensor 缓存在 ComfyUI 服务端，调参时向本节点包的后端接口请求 tone-map 预览帧。

viewer 功能：

- canvas 平移、缩放、适配窗口和 1:1 检查
- 实时调整曝光、tone mapping、白平衡、对比度、lift/gamma/gain/offset、阴影/高光、饱和度、vibrance、色相偏移和 false color
- source / graded / split 对比
- RGB 直方图
- HDR RGB 和显示 RGB 像素采样
- 批量图像帧切换
- 点击 `Save` 后把最终参数写回节点 widgets

节点输出：

- `graded_display`：用于预览或普通 `Save Image` 的 LDR 显示图。
- `graded_linear`：用于继续 HDR 处理或再次保存 EXR 的线性 HDR 图。

## 默认解码参数

```text
input_range = 0_1
apply_l_peak = true
l_peak = 4000
target_luminance = 16
target_percentile = 99.5
clamp_pu21 = true
```

如果希望保留更原始的 HDR 强度，可以把 `target_luminance` 设为 `0`，关闭百分位归一化。

## 输出说明

`X2HDR PU21 Decode` 返回 ComfyUI `IMAGE` tensor，但其中包含的是 float32 线性 HDR 值。数值大于 `1.0` 是正常现象。

`X2HDR Save EXR` 保存的是线性 float HDR RGB，不做 gamma，也不做 tone-map。它的第一个输出是实际写出的、已清理的 HDR 图像，可以继续接到下游 HDR 节点，不需要重新读取 EXR。

`X2HDR Tone Map Preview` 会返回 `preview`、`preview_aces`、`preview_reinhard` 和 `preview_log`。第一个 `preview` 输出由 `method` 参数决定。

示例 workflow scaffold：

```text
examples/x2hdr_text2image.json
```

## 验证建议

如需和参考 HDR decode 链路对齐，可以使用同一个 PU21 tensor，并保持 `l_peak`、`target_luminance`、`target_percentile` 一致。

建议误差标准：

```text
max_abs_error < 1e-4
mean_abs_error < 1e-5
```
