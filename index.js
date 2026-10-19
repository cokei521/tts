// ============================================================
// test.js — 方案一：API文档模态弹窗版本
// 在"主功能切换器"区域新增 API文档按钮，点击弹出模态框
// ============================================================

// ============================================================
// 第一部分：CSS 样式（新增部分）
// 将以下 CSS 追加到现有 <style> 标签内
// ============================================================

/* =============================================
   API 文档模态框样式（方案一新增）
   ============================================= */
.api-modal {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 20px;
}

.api-modal-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
}

.api-modal-content {
    position: relative;
    margin-top: 30px;
    width: 100%;
    max-width: 960px;
    max-height: calc(100vh - 60px);
    overflow-y: auto;
    z-index: 1;
    animation: apiModalIn 0.35s cubic-bezier(0.22, 0.61, 0.36, 1);
    border-radius: 18px;
}

@keyframes apiModalIn {
    from {
        opacity: 0;
        transform: translateY(-30px) scale(0.96);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.api-modal-content::-webkit-scrollbar {
    width: 6px;
}
.api-modal-content::-webkit-scrollbar-track {
    background: transparent;
}
.api-modal-content::-webkit-scrollbar-thumb {
    background: #3a3a5c;
    border-radius: 3px;
}

.api-modal-close {
    position: sticky;
    top: 12px;
    float: right;
    background: #e03131;
    color: #fff;
    border: none;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    font-size: 24px;
    cursor: pointer;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    box-shadow: 0 4px 14px rgba(224, 49, 49, 0.4);
    line-height: 1;
}
.api-modal-close:hover {
    background: #c92a2a;
    transform: scale(1.1) rotate(90deg);
    box-shadow: 0 6px 20px rgba(224, 49, 49, 0.6);
}

/* API文档按钮样式微调 */
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

/* 移动端适配 */
@media (max-width: 768px) {
    .api-modal-content {
        margin-top: 15px;
        max-height: calc(100vh - 30px);
        border-radius: 12px;
    }
    .api-modal-close {
        width: 34px;
        height: 34px;
        font-size: 20px;
        top: 8px;
    }
    #api-docs {
        padding: 20px 16px !important;
    }
    #api-docs h2 {
        font-size: 22px !important;
    }
    #api-docs h3 {
        font-size: 17px !important;
    }
    #api-docs table {
        font-size: 11px !important;
    }
    #api-docs pre {
        font-size: 11px !important;
        padding: 12px !important;
    }
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


// ============================================================
// 第二部分：HTML 修改
// ============================================================

/*
 * 2.1 修改 .mode-switcher（替换原有的 mode-switcher div）
 * 
 * 在原有两个按钮后新增第三个按钮：
 */

<!-- 主功能切换器 -->
<div class="mode-switcher">
    <button type="button" class="mode-btn active" id="ttsMode" data-panel="tts-panel">
        <span class="mode-icon">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
            </svg>
        </span>
        <span data-i18n="mode.tts">Text to Speech</span>
    </button>
    <button type="button" class="mode-btn" id="transcriptionMode" data-panel="transcription-panel">
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
    <!-- ===== 新增：API文档按钮 ===== -->
    <button type="button" class="mode-btn mode-btn-doc" id="apiDocMode">
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
 * 2.2 在 </body> 之前（所有主内容结束后），添加模态框 HTML：
 */

<!-- ===== 新增：API 文档模态框 ===== -->
<div id="apiDocModal" class="api-modal" style="display: none;">
    <div class="api-modal-overlay"></div>
    <div class="api-modal-content">
        <button class="api-modal-close" id="apiModalClose" aria-label="关闭">&times;</button>
        
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

                <!-- 请求参数表 -->
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

                <!-- 请求参数表 -->
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
</div>


// ============================================================
// 第三部分：JavaScript 新增
// 在 setupEventListeners() 函数内部追加以下代码
// ============================================================

/**
 * 方案一：API 文档模态框事件绑定
 * 放在 setupEventListeners() 函数内部
 */
(function initApiDocModal() {
    const modal = document.getElementById('apiDocModal');
    const openBtn = document.getElementById('apiDocMode');
    const closeBtn = document.getElementById('apiModalClose');
    const overlay = modal ? modal.querySelector('.api-modal-overlay') : null;

    if (!modal || !openBtn) return;

    // 打开模态框
    openBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // 禁止背景滚动
    });

    // 关闭模态框
    function closeModal() {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (overlay) overlay.addEventListener('click', closeModal);

    // ESC 关闭
    document.addEventListener('keydown', function apiDocEscHandler(e) {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeModal();
        }
    });

    // 点击模态框内容区域不关闭（阻止事件冒泡到 overlay）
    const content = modal.querySelector('.api-modal-content');
    if (content) {
        content.addEventListener('click', (e) => e.stopPropagation());
    }
})();


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
