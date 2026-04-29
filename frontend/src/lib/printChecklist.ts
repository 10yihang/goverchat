interface ChecklistData {
  title: string
  category: string
  materials: string[]
  conditions?: string[]
  tips?: string[]
}

export function openChecklistWindow(data: ChecklistData) {
  const materialsHtml = data.materials
    .map(
      (m, i) => `
    <div class="item">
      <input type="checkbox" id="m${i}" />
      <label for="m${i}">${m}</label>
    </div>`
    )
    .join("")

  const conditionsHtml = data.conditions?.length
    ? `<div class="section">
        <h3>📋 办理条件</h3>
        ${data.conditions.map((c) => `<p class="cond">• ${c}</p>`).join("")}
      </div>`
    : ""

  const tipsHtml = data.tips?.length
    ? `<div class="section">
        <h3>💡 温馨提示</h3>
        ${data.tips.map((t) => `<p class="cond">• ${t}</p>`).join("")}
      </div>`
    : ""

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>材料清单 - ${data.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
      color: #1a1a2e; background: #fff; max-width: 720px; margin: 40px auto; padding: 0 20px;
    }
    .header {
      border-bottom: 2px solid #1e3a5f; padding-bottom: 16px; margin-bottom: 24px;
    }
    .header h1 { font-family: "Noto Serif SC", serif; font-size: 22px; color: #1e3a5f; }
    .header .cat { font-size: 12px; color: #666; margin-top: 4px; }
    .header .meta { font-size: 12px; color: #999; margin-top: 12px; }
    .section { margin-bottom: 24px; }
    .section h3 { font-size: 15px; margin-bottom: 10px; color: #1e3a5f; }
    .item {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 10px 12px; margin-bottom: 6px; border: 1px solid #e2e8f0; border-radius: 6px;
      background: #f8fafc;
    }
    .item input[type="checkbox"] { width: 18px; height: 18px; margin-top: 2px; accent-color: #1e3a5f; flex-shrink: 0; }
    .item label { font-size: 14px; line-height: 1.6; cursor: pointer; }
    .cond { font-size: 13px; line-height: 1.7; color: #555; margin-bottom: 4px; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #999; text-align: center; }
    .print-btn {
      position: fixed; bottom: 24px; right: 24px;
      padding: 12px 24px; border: none; border-radius: 8px;
      background: #1e3a5f; color: #fff; font-size: 14px; cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .print-btn:hover { background: #152a45; }
    @media print {
      .print-btn { display: none; }
      body { margin: 20px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <span class="cat">${data.category}</span>
    <h1>${data.title}</h1>
    <p class="meta">请对照清单准备以下材料，备齐后可在线提交申请</p>
  </div>

  <div class="section">
    <h3>📎 所需材料</h3>
    ${materialsHtml}
  </div>

  ${conditionsHtml}
  ${tipsHtml}

  <div class="footer">
    本清单由 政务智聊 自动生成 · 仅供办事参考 · ${new Date().toLocaleDateString("zh-CN")}
  </div>

  <button class="print-btn" onclick="window.print()">🖨️ 打印清单</button>
</body>
</html>`

  const w = window.open("", "_blank", "width=800,height=700")
  if (w) {
    w.document.write(html)
    w.document.close()
  }
}
