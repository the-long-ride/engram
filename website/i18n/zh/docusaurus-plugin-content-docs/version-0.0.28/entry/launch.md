---
title: 启动控制面板
sidebar_position: 2
description: 运行 engram entry 启动本地 Entry 控制面板。
---

# 启动控制面板

启动面板：

```bash
engram entry
```

该命令将启动本地服务器并在默认浏览器中打开面板 URL。

## 浏览器行为

面板会自动在默认浏览器中打开。如果未打开，请手动将打印的 URL 复制到浏览器中。

## 本地服务器行为

服务器绑定在本地，因此只有您的机器可以访问它。默认情况下它不会向网络公开。

## 关闭服务器流程

从 **Runtime** 标签页使用 **Close server** 操作关闭服务器，或停止启动 `engram entry` 的终端进程。关闭浏览器标签页不会停止服务器。

## 常见启动错误

- **Port already in use (端口已被使用)** — 另一个进程正在使用面板端口。停止它或遵循打印的备选说明。
- **Browser did not open (浏览器未打开)** — 手动将打印的 URL 复制到浏览器中。
- **No workspace initialized (未初始化工作区)** — 先运行 `engram inject`，或者在项目根目录下使用 `engram entry`。

## 后续步骤

- [Connections 标签页](connections.md)
- [Construct 标签页](construct.md)
