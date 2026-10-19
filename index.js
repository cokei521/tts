// ============================================================
// test.js — 方案二：API文档面板切换版本
// 在"主功能切换器"区域新增 API文档按钮，通过 data-panel 切换展示
// ============================================================

// ============================================================
// 第一部分：CSS 样式（新增部分）
// 将以下 CSS 追加到现有 <style> 标签内
// ============================================================

/* =============================================
   API 文档面板样式（方案二新增）
   ============================================= */

/* API文档面板容器 */
#api-docs-panel {
    padding: 20px;
    overflow-y: auto;
    max-height: calc(100vh - 200px);
}

#api-docs-panel::-webkit-scrollbar {
    width: 6px;
}
#api-docs-panel::-webkit-scrollbar-track {
    background: transparent;
}
#api-docs-panel::-webkit-scrollbar-thumb {
    background: #3a3a5c;
    border-radius: 3px;
}

/* API文档按钮样式 */
.mode-btn-doc {
    border-color: rgba(124, 131, 255, 0.6) !important;
}
.mode-btn-doc:hover {
    border-color: rgba(124, 131, 255, 0.9) !important;
    box-shadow: 0 0 20px rgba(124, 131, 255, 0.25);
}
.mode-btn-doc .mode-icon {
    color: #7c83ff;
}

/* API文档按钮激活态 */
.mode-btn-doc.active {
    background: rgba(124, 131, 255, 0.15) !important;
    border-color: #7c83ff !important;
    box-shadow: 0 0 20px rgba(124, 131, 255, 0.35);
}

/* 三按钮时 mode-btn 宽度适配 */
@media (min-width: 769px) {
    .mode-btn {
        max-width: 200px;
    }
}
@media (max-width: 768px) {
    .mode-btn {
        max-width: none;
        padding: 12px 14px;
        font-size: 0.85rem;
        gap: 6px;
    }
}

/* 移动端 API 文档面板适配 */
@media (max-width: 768px) {
    #api-docs-panel {
        padding: 12px;
        max-height: none;
    }
    #api-docs-panel #api-docs {
        padding: 20px 14px !important;
    }
    #api-docs-panel h2 {
        font-size: 22px !important;
    }
    #api-docs-panel h3 {
        font-size: 17px !important;
    }
    #api-docs-panel table {
        font-size: 11px !important;
    }
    #api-docs-panel pre {
        font-size: 11px !important;
        padding: 12px !important;
    }
}


// ============================================================
// 第二部分：HTML 修改
// ============================================================

/*
 * 2.1 修改 .mode-switcher（替换原有的 mode-switcher div）
 *
 * 注意：方案二中按钮使用 data-panel 属性，
 * 与现有 TTS/STT 按钮保持一致的切换逻辑。
 */

<!-- 主功能切换器 -->
<div class="mode-switcher">
    <button type="button" class="mode-btn active" data-panel="tts-panel">
        <span class="mode-icon">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
            </svg>
        </span>
        <span data-i18n="mode.tts">Text to Speech</span>
    </button>
    <button type="button" class="mode-btn" data-panel="transcription-panel">
        <span class="mode-icon">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 9m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/>
                <path d="M9 17v4"/>
                <path d="M12 13a3 3 0 0 0 3 -3"/>
                <path d="M15 9.5v-3a3 3 0 0 0 -3 -3h-1"/>
                <path d="M19 8v8"/>
                <path d="M17 9v6"/>
                <path d="M21 9v6"/>
            </svg>
        </span>
        <span data-i18n="mode.transcription">Speech to Text</span>
    </button>
    <!-- ===== 新增：API文档按钮（使用 data-panel 关联面板） ===== -->
    <button type="button" class="mode-btn mode-btn-doc" data-panel="api-docs-panel">
        <span class="mode-icon">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
                <path d="M8 12h8v2H8zm0 4h5v2H8z"/>
            </svg>
        </span>
        <span data-i18n="mode.apiDoc">API文档</span>
    </button>
</div>


/*
 * 2.2 在 .main-content 区域内，transcription-panel 之后，
 * 新增 API 文档面板：
 */

<!-- ===== 新增：API 文档面板 ===== -->
<div class="panel" id="api-docs-panel" style="display: none;">
    <div id="api-docs" style="max-width: 900px; margin: 0 auto; padding: 30px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; color: #e0e0e0; font-family: 'Segoe UI', system-ui, sans-serif; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
        
        <h2 style="text-align: center; color: #7c83ff; margin-bottom: 10px; font-size: 28px;">
            📡 API 调用文档
        </h2>
        <p style="text-align: center; color: #999; margin-bottom: 30px; font-size: 14px;">
            支持文字转语音 & 语音转文字，兼容 OpenAI 接口格式
        </p>

        <!-- ========== 文字转语音 (TTS) ========== -->
        <div style="background: #0f3460; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #1a508b;">
            <h3 style="color: #51cf66; margin: 0 0 8px 0; font-size: 20px;">
                🎙️ 文字转语音 (TTS)
            </h3>
            <p style="color: #a0a0b8; margin: 0 0 16px 0; font-size: 14px;">
                <code style="background: #16213e; padding: 4px 10px; border-radius: 6px; color: #f08d49; font-weight: bold;">POST /v1/audio/speech</code>
                <span style="color: #666;"> — 将文字转换为语音（MP3 格式）</span>
            </p>

            <table style="width:100%; border-collapse:collapse; margin-bottom:16px; font-size:13px;">
                <tr style="background:#16213e;">
                    <th style="padding:8px 12px; text-align:left; color:#ccc; border:1px solid #1a508b;">参数名</th>
                    <th style="padding:8px 12px; text-align:left; color:#ccc; border:1px solid #1a508b;">类型</th>
                    <th style="padding:8px 12px; text-align:left; color:#ccc; border:1px solid #1a508b;">必填</th>
                    <th style="padding:8px 12px; text-align:left; color:#ccc; border:1px solid #1a508b;">说明</th>
                </tr>
                <tr>
                    <td style="padding:8px 12px; border:1px solid #1a508b;">input</td>
                    <td style="padding:8px 12px; border:1px solid #1a508b;">string</td>
                    <td style="padding:8px 12px; border:1px solid #1a508b; color:#51cf66;">✅</td>
                    <td style="padding:8px 12px; border:1px solid #1a508b;">要转换的文字内容</td>
                </tr>
                <tr style="background:#16213e;">
                    <td style="padding:8px 12px; border:1px solid #1a508b;">voice</td>
                    <td style="padding:8px 12px; border:1px solid #1a508b;">string</td>
                    <td style="padding:8px 12px; border:1px solid #1a508b;">可选</td>
                    <td style="padding:8px 12px; border:1px solid #1a508b;">语音角色，默认 zh-CN-XiaoxiaoNeural</td>
                </tr>
                <tr>
                    <td style="padding:8px 12px; border:1px solid #1a508b;">speed</td>
                    <td style="padding:8px 12px; border:1px solid #1a508b;">number</td>
                    <td style="padding:8px 12px; border:1px solid #1a508b;">可选</td>
                    <td style="padding:8px 12px; border:1px solid #1a508b;">语速，默认 1.0</td>
                </tr>
                <tr style="background:#16213e;">
                    <td style="padding:8px 12px; border:1px solid #1a508b;">pitch</td>
                    <td style="padding:8px 12px; border:1px solid #1a508b;">string</td>
                    <td style="padding:8px 12px; border:1px solid #1a508b;">可选</td>
                    <td style="padding:8px 12px; border:1px solid #1a508b;">音调，默认 "0"</td>
                </tr>
                <tr>
                    <td style="padding:8px 12px; border:1px solid #1a508b;">style</td>
                    <td style="padding:8px 12px; border:1px solid #1a508b;">string</td>
                    <td style="padding:8px 12px; border:1px solid #1a508b;">可选</td>
                    <td style="padding:8px 12px; border:1px solid #1a508b;">语音风格，默认 "general"</td>
                </tr>
            </table>

            <p style="font-weight:bold; color:#f9e2af; margin:16px 0 6px 0; font-size:14px;">📋 JavaScript 示例：</p>
            <pre style="background:#0a0a1a; padding:16px; border-radius:8px; overflow-x:auto; font-size:13px; line-height:1.7; color:#cdd6f4; border:1px solid #1a508b;"><code>const response = await fetch('https://your-worker.workers.dev/v1/audio/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        input: "你好，这是一个测试",
        voice: "zh-CN-XiaoxiaoNeural",
        speed: 1.0,
        pitch: "0",
        style: "general"
    })
});
const audioBlob = await response.blob();
// 播放或下载音频...</code></pre>

            <p style="font-weight:bold; color:#f9e2af; margin:16px 0 6px 0; font-size:14px;">📋 cURL 示例：</p>
            <pre style="background:#0a0a1a; padding:16px; border-radius:8px; overflow-x:auto; font-size:13px; line-height:1.7; color:#cdd6f4; border:1px solid #1a508b;"><code>curl -X POST "https://your-worker.workers.dev/v1/audio/speech" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "你好，这是一个测试",
    "voice": "zh-CN-XiaoxiaoNeural",
    "speed": 1.0,
    "pitch": "0",
    "style": "general"
  }' \
  --output speech.mp3</code></pre>
        </div>

        <!-- ========== 语音转文字 (STT) ========== -->
        <div style="background: #0f3460; border-radius: 12px; padding: 24px; border: 1px solid #1a508b;">
            <h3 style="color: #45aaf2; margin: 0 0 8px 0; font-size: 20px;">
                🎧 语音转文字 (STT)
            </h3>
            <p style="color: #a0a0b8; margin: 0 0 16px 0; font-size: 14px;">
                <code style="background: #16213e; padding: 4px 10px; border-radius: 6px; color: #f08d49; font-weight: bold;">POST /v1/audio/transcriptions</code>
                <span style="color: #666;"> — 将音频文件转录为文字</span>
            </p>

            <table style="width:100%; border-collapse:collapse; margin-bottom:16px; font-size:13px;">
                <tr style="background:#16213e;">
                    <th style="padding:8px 12px; text-align:left; color:#ccc; border:1px solid #1a508b;">参数名</th>
                    <th style="padding:8px 12px; text-align:left; color:#ccc; border:1px solid #1a508b;">类型</th>
                    <th style="padding:8px 12px; text-align:left; color:#ccc; border:1px solid #1a508b;">必填</th>
                    <th style="padding:8px 12px; text-align:left; color:#ccc; border:1px solid #1a508b;">说明</th>
                </tr>
                <tr>
                    <td style="padding:8px 12px; border:1px solid #1a508b;">file</td>
                    <td style="padding:8px 12px; border:1px solid #1a508b;">File</td>
                    <td style="padding:8px 12px; border:1px solid #1a508b; color:#51cf66;">✅</td>
                    <td style="padding:8px 12px; border:1px solid #1a508b;">音频文件（multipart/form-data）</td>
                </tr>
                <tr style="background:#16213e;">
                    <td style="padding:8px 12px; border:1px solid #1a508b;">token</td>
                    <td style="padding:8px 12px; border:1px solid #1a508b;">string</td>
                    <td style="padding:8px 12px; border:1px solid #1a508b;">可选</td>
                    <td style="padding:8px 12px; border:1px solid #1a508b;">SiliconFlow Token（不提供则用默认）</td>
                </tr>
            </table>

            <p style="font-weight:bold; color:#f9e2af; margin:16px 0 6px 0; font-size:14px;">📋 JavaScript 示例：</p>
            <pre style="background:#0a0a1a; padding:16px; border-radius:8px; overflow-x:auto; font-size:13px; line-height:1.7; color:#cdd6f4; border:1px solid #1a508b;"><code>const formData = new FormData();
formData.append('file', audioFile);        // 音频文件
formData.append('token', 'sk-...');        // 可选

const response = await fetch(
    'https://your-worker.workers.dev/v1/audio/transcriptions',
    { method: 'POST', body: formData }
);

const result = await response.json();
console.log(result.text); // 转录结果</code></pre>

            <p style="font-weight:bold; color:#f9e2af; margin:16px 0 6px 0; font-size:14px;">📋 cURL 示例：</p>
            <pre style="background:#0a0a1a; padding:16px; border-radius:8px; overflow-x:auto; font-size:13px; line-height:1.7; color:#cdd6f4; border:1px solid #1a508b;"><code>curl -X POST "https://your-worker.workers.dev/v1/audio/transcriptions" \
  -F "file=@audio.mp3" \
  -F "token=your-siliconflow-token"</code></pre>
        </div>
    </div>
</div>


// ============================================================
// 第三部分：JavaScript 修改
// 方案二几乎无需新增 JS 代码！
// data-panel 机制会自动处理面板切换。
// ============================================================

/*
 * 唯一需要注意：如果现有的面板切换函数中有特殊初始化逻辑
 * （例如切换到 TTS 面板时重置某些状态），需要添加判断跳过 API 文档面板。
 *
 * 在 switchMode 或类似的切换函数中，添加：
 */

// 示例：在现有的切换逻辑中添加判断
function switchMode(panelId) {
    // ... 现有的切换逻辑 ...
    
    // 如果切换到 API 文档面板，跳过特殊初始化
    if (panelId === 'api-docs-panel') {
        // API 文档面板无需额外初始化
        return;
    }
    
    // ... 其余 TTS/STT 初始化逻辑 ...
}


// ============================================================
// 第四部分：国际化翻译数据
// 在 translations 对象的每种语言中添加：
// ============================================================

/*
 * 在现有的 translations 对象中，为每种语言添加：
 *
 * 'mode.apiDoc': {
 *     en: 'API Docs',
 *     zh: 'API文档',
 *     ja: 'APIドキュメント',
 *     ko: 'API 문서',
 *     es: 'Docs API',
 *     fr: 'Docs API',
 *     de: 'API-Dokumentation',
 *     ru: 'API Документация'
 * }
 */
