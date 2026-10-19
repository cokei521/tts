// ============================================================
// test.js — 方案二：API文档面板切换版本
// 在"主功能切换器"区域新增 API文档按钮，通过 data-panel 切换展示
// ============================================================

// ============================================================
// 第一部分：注入 CSS 样式
// ============================================================
(function injectStyles() {
    var style = document.createElement('style');
    style.textContent = '\
#api-docs-panel {\
    padding: 20px;\
    overflow-y: auto;\
    max-height: calc(100vh - 200px);\
}\
\
#api-docs-panel::-webkit-scrollbar {\
    width: 6px;\
}\
#api-docs-panel::-webkit-scrollbar-track {\
    background: transparent;\
}\
#api-docs-panel::-webkit-scrollbar-thumb {\
    background: #3a3a5c;\
    border-radius: 3px;\
}\
\
.mode-btn-doc {\
    border-color: rgba(124, 131, 255, 0.6) !important;\
}\
.mode-btn-doc:hover {\
    border-color: rgba(124, 131, 255, 0.9) !important;\
    box-shadow: 0 0 20px rgba(124, 131, 255, 0.25);\
}\
.mode-btn-doc .mode-icon {\
    color: #7c83ff;\
}\
\
.mode-btn-doc.active {\
    background: rgba(124, 131, 255, 0.15) !important;\
    border-color: #7c83ff !important;\
    box-shadow: 0 0 20px rgba(124, 131, 255, 0.35);\
}\
\
@media (min-width: 769px) {\
    .mode-btn {\
        max-width: 200px;\
    }\
}\
@media (max-width: 768px) {\
    .mode-btn {\
        max-width: none;\
        padding: 12px 14px;\
        font-size: 0.85rem;\
        gap: 6px;\
    }\
    #api-docs-panel {\
        padding: 12px;\
        max-height: none;\
    }\
    #api-docs-panel #api-docs {\
        padding: 20px 14px !important;\
    }\
    #api-docs-panel h2 {\
        font-size: 22px !important;\
    }\
    #api-docs-panel h3 {\
        font-size: 17px !important;\
    }\
    #api-docs-panel table {\
        font-size: 11px !important;\
    }\
    #api-docs-panel pre {\
        font-size: 11px !important;\
        padding: 12px !important;\
    }\
}';
    document.head.appendChild(style);
})();


// ============================================================
// 第二部分：向 mode-switcher 追加 API 文档按钮
// ============================================================
(function addApiDocButton() {
    var switcher = document.querySelector('.mode-switcher');
    if (!switcher) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mode-btn mode-btn-doc';
    btn.setAttribute('data-panel', 'api-docs-panel');

    btn.innerHTML = '\
        <span class="mode-icon">\
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">\
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>\
                <path d="M8 12h8v2H8zm0 4h5v2H8z"/>\
            </svg>\
        </span>\
        <span data-i18n="mode.apiDoc">API文档</span>\
    ';

    switcher.appendChild(btn);
})();


// ============================================================
// 第三部分：创建 API 文档面板
// ============================================================
(function createApiDocPanel() {
    var panel = document.createElement('div');
    panel.className = 'panel';
    panel.id = 'api-docs-panel';
    panel.style.display = 'none';

    panel.innerHTML = '\
    <div id="api-docs" style="max-width: 900px; margin: 0 auto; padding: 30px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; color: #e0e0e0; font-family: \'Segoe UI\', system-ui, sans-serif; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">\
        \
        <h2 style="text-align: center; color: #7c83ff; margin-bottom: 10px; font-size: 28px;">\
            📡 API 调用文档\
        </h2>\
        <p style="text-align: center; color: #999; margin-bottom: 30px; font-size: 14px;">\
            支持文字转语音 & 语音转文字，兼容 OpenAI 接口格式\
        </p>\
\
        <!-- ========== 文字转语音 (TTS) ========== -->\
        <div style="background: #0f3460; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #1a508b;">\
            <h3 style="color: #51cf66; margin: 0 0 8px 0; font-size: 20px;">\
                🎙️ 文字转语音 (TTS)\
            </h3>\
            <p style="color: #a0a0b8; margin: 0 0 16px 0; font-size: 14px;">\
                <code style="background: #16213e; padding: 4px 10px; border-radius: 6px; color: #f08d49; font-weight: bold;">POST /v1/audio/speech</code>\
                <span style="color: #666;"> — 将文字转换为语音（MP3 格式）</span>\
            </p>\
\
            <table style="width:100%; border-collapse:collapse; margin-bottom:16px; font-size:13px;">\
                <tr style="background:#16213e;">\
                    <th style="padding:8px 12px; text-align:left; color:#ccc; border:1px solid #1a508b;">参数名</th>\
                    <th style="padding:8px 12px; text-align:left; color:#ccc; border:1px solid #1a508b;">类型</th>\
                    <th style="padding:8px 12px; text-align:left; color:#ccc; border:1px solid #1a508b;">必填</th>\
                    <th style="padding:8px 12px; text-align:left; color:#ccc; border:1px solid #1a508b;">说明</th>\
                </tr>\
                <tr>\
                    <td style="padding:8px 12px; border:1px solid #1a508b;">input</td>\
                    <td style="padding:8px 12px; border:1px solid #1a508b;">string</td>\
                    <td style="padding:8px 12px; border:1px solid #1a508b; color:#51cf66;">✅</td>\
                    <td style="padding:8px 12px; border:1px solid #1a508b;">要转换的文字内容</td>\
                </tr>\
                <tr style="background:#16213e;">\
                    <td style="padding:8px 12px; border:1px solid #1a508b;">voice</td>\
                    <td style="padding:8px 12px; border:1px solid #1a508b;">string</td>\
                    <td style="padding:8px 12px; border:1px solid #1a508b;">可选</td>\
                    <td style="padding:8px 12px; border:1px solid #1a508b;">语音角色，默认 zh-CN-XiaoxiaoNeural</td>\
                </tr>\
                <tr>\
                    <td style="padding:8px 12px; border:1px solid #1a508b;">speed</td>\
                    <td style="padding:8px 12px; border:1px solid #1a508b;">number</td>\
                    <td style="padding:8px 12px; border:1px solid #1a508b;">可选</td>\
                    <td style="padding:8px 12px; border:1px solid #1a508b;">语速，默认 1.0</td>\
                </tr>\
                <tr style="background:#16213e;">\
                    <td style="padding:8px 12px; border:1px solid #1a508b;">pitch</td>\
                    <td style="padding:8px 12px; border:1px solid #1a508b;">string</td>\
                    <td style="padding:8px 12px; border:1px solid #1a508b;">可选</td>\
                    <td style="padding:8px 12px; border:1px solid #1a508b;">音调，默认 "0"</td>\
                </tr>\
                <tr>\
                    <td style="padding:8px 12px; border:1px solid #1a508b;">style</td>\
                    <td style="padding:8px 12px; border:1px solid #1a508b;">string</td>\
                    <td style="padding:8px 12px; border:1px solid #1a508b;">可选</td>\
                    <td style="padding:8px 12px; border:1px solid #1a508b;">语音风格，默认 "general"</td>\
                </tr>\
            </table>\
\
            <p style="font-weight:bold; color:#f9e2af; margin:16px 0 6px 0; font-size:14px;">📋 JavaScript 示例：</p>\
            <pre style="background:#0a0a1a; padding:16px; border-radius:8px; overflow-x:auto; font-size:13px; line-height:1.7; color:#cdd6f4; border:1px solid #1a508b;"><code>const response = await fetch(\'https://your-worker.workers.dev/v1/audio/speech\', {\
    method: \'POST\',\
    headers: { \'Content-Type\': \'application/json\' },\
    body: JSON.stringify({\
        input: "你好，这是一个测试",\
        voice: "zh-CN-XiaoxiaoNeural",\
        speed: 1.0,\
        pitch: "0",\
        style: "general"\
    })\
});\
const audioBlob = await response.blob();\
// 播放或下载音频...</code></pre>\
\
            <p style="font-weight:bold; color:#f9e2af; margin:16px 0 6px 0; font-size:14px;">📋 cURL 示例：</p>\
            <pre style="background:#0a0a1a; padding:16px; border-radius:8px; overflow-x:auto; font-size:13px; line-height:1.7; color:#cdd6f4; border:1px solid #1a508b;"><code>curl -X POST "https://your-worker.workers.dev/v1/audio/speech" \\\
  -H "Content-Type: application/json" \\\
  -d \'{\
    "input": "你好，这是一个测试",\
    "voice": "zh-CN-XiaoxiaoNeural",\
    "speed": 1.0,\
    "pitch": "0",\
    "style": "general"\
  }\' \\\
  --output speech.mp3</code></pre>\
        </div>\
\
        <!-- ========== 语音转文字 (STT) ========== -->\
        <div style="background: #0f3460; border-radius: 12px; padding: 24px; border: 1px solid #1a508b;">\
            <h3 style="color: #45aaf2; margin: 0 0 8px 0; font-size: 20px;">\
                🎧 语音转文字 (STT)\
            </h3>\
            <p style="color: #a0a0b8; margin: 0 0 16px 0; font-size: 14px;">\
                <code style="background: #16213e; padding: 4px 10px; border-radius: 6px; color: #f08d49; font-weight: bold;">POST /v1/audio/transcriptions</code>\
                <span style="color: #666;"> — 将音频文件转录为文字</span>\
            </p>\
\
            <table style="width:100%; border-collapse:collapse; margin-bottom:16px; font-size:13px;">\
                <tr style="background:#16213e;">\
                    <th style="padding:8px 12px; text-align:left; color:#ccc; border:1px solid #1a508b;">参数名</th>\
                    <th style="padding:8px 12px; text-align:left; color:#ccc; border:1px solid #1a508b;">类型</th>\
                    <th style="padding:8px 12px; text-align:left; color:#ccc; border:1px solid #1a508b;">必填</th>\
                    <th style="padding:8px 12px; text-align:left; color:#ccc; border:1px solid #1a508b;">说明</th>\
                </tr>\
                <tr>\
                    <td style="padding:8px 12px; border:1px solid #1a508b;">file</td>\
                    <td style="padding:8px 12px; border:1px solid #1a508b;">File</td>\
                    <td style="padding:8px 12px; border:1px solid #1a508b; color:#51cf66;">✅</td>\
                    <td style="padding:8px 12px; border:1px solid #1a508b;">音频文件（multipart/form-data）</td>\
                </tr>\
                <tr style="background:#16213e;">\
                    <td style="padding:8px 12px; border:1px solid #1a508b;">token</td>\
                    <td style="padding:8px 12px; border:1px solid #1a508b;">string</td>\
                    <td style="padding:8px 12px; border:1px solid #1a508b;">可选</td>\
                    <td style="padding:8px 12px; border:1px solid #1a508b;">SiliconFlow Token（不提供则用默认）</td>\
                </tr>\
            </table>\
\
            <p style="font-weight:bold; color:#f9e2af; margin:16px 0 6px 0; font-size:14px;">📋 JavaScript 示例：</p>\
            <pre style="background:#0a0a1a; padding:16px; border-radius:8px; overflow-x:auto; font-size:13px; line-height:1.7; color:#cdd6f4; border:1px solid #1a508b;"><code>const formData = new FormData();\
formData.append(\'file\', audioFile);        // 音频文件\
formData.append(\'token\', \'sk-...\');        // 可选\
\
const response = await fetch(\
    \'https://your-worker.workers.dev/v1/audio/transcriptions\',\
    { method: \'POST\', body: formData }\
);\
\
const result = await response.json();\
console.log(result.text); // 转录结果</code></pre>\
\
            <p style="font-weight:bold; color:#f9e2af; margin:16px 0 6px 0; font-size:14px;">📋 cURL 示例：</p>\
            <pre style="background:#0a0a1a; padding:16px; border-radius:8px; overflow-x:auto; font-size:13px; line-height:1.7; color:#cdd6f4; border:1px solid #1a508b;"><code>curl -X POST "https://your-worker.workers.dev/v1/audio/transcriptions" \\\
  -F "file=@audio.mp3" \\\
  -F "token=your-siliconflow-token"</code></pre>\
        </div>\
    </div>';

    // 追加到 .main-content 容器中
    var container = document.querySelector('.main-content');
    if (container) {
        container.appendChild(panel);
    }
})();


// ============================================================
// 第四部分：拦截 switchMode，适配 API 文档面板
// ============================================================
(function patchSwitchMode() {
    if (typeof switchMode !== 'function') return;

    var originalSwitchMode = switchMode;

    window.switchMode = function(panelId) {
        // API 文档面板：只需切换显示，跳过音频相关初始化
        if (panelId === 'api-docs-panel') {
            document.querySelectorAll('.panel').forEach(function(p) {
                p.style.display = 'none';
            });
            document.querySelectorAll('.mode-btn').forEach(function(b) {
                b.classList.remove('active');
            });
            var panel = document.getElementById('api-docs-panel');
            var btn = document.querySelector('[data-panel="api-docs-panel"]');
            if (panel) panel.style.display = 'block';
            if (btn) btn.classList.add('active');
            return;
        }
        // 其他面板走原始逻辑
        originalSwitchMode(panelId);
    };
})();


// ============================================================
// 第五部分：国际化翻译数据
// ============================================================
(function addApiDocI18n() {
    if (typeof translations === 'undefined') return;

    var i18nKeys = {
        en: 'API Docs',
        zh: 'API文档',
        ja: 'APIドキュメント',
        ko: 'API 문서',
        es: 'Docs API',
        fr: 'Docs API',
        de: 'API-Dokumentation',
        ru: 'API Документация'
    };

    Object.keys(i18nKeys).forEach(function(lang) {
        if (translations[lang]) {
            translations[lang]['mode.apiDoc'] = i18nKeys[lang];
        }
    });
})();
