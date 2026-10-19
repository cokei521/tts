// ============================================================================
// Cloudflare Worker - 多模型 API 转发服务
// ============================================================================

// 全局变量：所有可用的模型列表
let ALL_TOKENS = [];
let ALL_MODELS = [];

// 环境变量判断（兼容 wrangler secret 和 process.env）
const getEnv = (key) => {
    try {
        if (typeof env !== 'undefined' && env && env[key]) return env[key];
    } catch (e) {}
    try {
        if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
    } catch (e) {}
    return null;
};

// HTML 页面模板
const HTML_PAGE = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API 服务状态 - Cloudflare Worker</title>
    <style>
        :root {
            --bg-primary: #0d1117;
            --bg-secondary: #161b22;
            --bg-tertiary: #21262d;
            --text-primary: #c9d1d9;
            --text-secondary: #8b949e;
            --border-color: #30363d;
            --accent-green: #3fb950;
            --accent-blue: #58a6ff;
            --accent-orange: #d2991d;
            --accent-red: #f85149;
            --accent-purple: #a371f7;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
            background-color: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
            min-height: 100vh;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }

        header {
            text-align: center;
            padding: 30px 0;
            border-bottom: 1px solid var(--border-color);
            margin-bottom: 30px;
        }

        header h1 {
            font-size: 2em;
            margin-bottom: 8px;
            background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        header p {
            color: var(--text-secondary);
            font-size: 0.95em;
        }

        .status-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 20px;
            transition: all 0.3s ease;
        }

        .status-card:hover {
            border-color: var(--accent-blue);
            box-shadow: 0 4px 20px rgba(88, 166, 255, 0.1);
        }

        .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
        }

        .card-title {
            font-size: 1.2em;
            font-weight: 600;
        }

        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: 600;
        }

        .badge-success {
            background: rgba(63, 185, 80, 0.15);
            color: var(--accent-green);
        }

        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
        }

        .info-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .info-label {
            font-size: 0.8em;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .info-value {
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.9em;
            word-break: break-all;
        }

        .info-value a {
            color: var(--accent-blue);
            text-decoration: none;
        }

        .info-value a:hover {
            text-decoration: underline;
        }

        .models-section {
            margin-top: 20px;
        }

        .models-title {
            font-size: 1em;
            font-weight: 600;
            margin-bottom: 12px;
            color: var(--text-secondary);
        }

        .model-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        .model-tag {
            background: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 0.85em;
            font-family: 'Consolas', 'Monaco', monospace;
            transition: all 0.2s ease;
        }

        .model-tag:hover {
            border-color: var(--accent-purple);
            background: rgba(163, 113, 247, 0.1);
        }

        .endpoints-section {
            margin-top: 20px;
        }

        .endpoints-title {
            font-size: 1em;
            font-weight: 600;
            margin-bottom: 12px;
            color: var(--text-secondary);
        }

        .endpoint-item {
            background: var(--bg-tertiary);
            border-radius: 8px;
            padding: 14px 18px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .endpoint-method {
            font-weight: 700;
            font-size: 0.8em;
            padding: 3px 8px;
            border-radius: 4px;
            text-transform: uppercase;
        }

        .method-post {
            background: rgba(63, 185, 80, 0.2);
            color: var(--accent-green);
        }

        .method-get {
            background: rgba(88, 166, 255, 0.2);
            color: var(--accent-blue);
        }

        .endpoint-path {
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.9em;
            flex: 1;
        }

        footer {
            text-align: center;
            padding: 30px 0;
            color: var(--text-secondary);
            font-size: 0.85em;
            border-top: 1px solid var(--border-color);
            margin-top: 30px;
        }

        .pulse {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--accent-green);
            margin-right: 8px;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% {
                opacity: 1;
            }
            50% {
                opacity: 0.4;
            }
        }

        @media (max-width: 600px) {
            .container {
                padding: 12px;
            }
            header h1 {
                font-size: 1.5em;
            }
            .info-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🚀 API 服务运行中</h1>
            <p>Cloudflare Worker - 多模型 API 转发服务</p>
        </header>

        <div class="status-card">
            <div class="card-header">
                <span class="card-title"><span class="pulse"></span>服务状态</span>
                <span class="badge badge-success">运行中</span>
            </div>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">服务地址</span>
                    <span class="info-value" id="worker-url">加载中...</span>
                </div>
                <div class="info-item">
                    <span class="info-label">API 密钥</span>
                    <span class="info-value" id="api-key-display">需设置 API_KEY</span>
                </div>
                <div class="info-item">
                    <span class="info-label">可用模型数</span>
                    <span class="info-value" id="model-count">-</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Token 池数量</span>
                    <span class="info-value" id="token-count">-</span>
                </div>
            </div>
        </div>

        <div class="status-card">
            <div class="card-header">
                <span class="card-title">🔗 可用端点</span>
            </div>
            <div class="endpoints-section">
                <div class="endpoint-item">
                    <span class="endpoint-method method-post">POST</span>
                    <span class="endpoint-path">/v1/chat/completions</span>
                    <span style="color: var(--text-secondary); font-size: 0.8em;">聊天补全</span>
                </div>
                <div class="endpoint-item">
                    <span class="endpoint-method method-post">POST</span>
                    <span class="endpoint-path">/v1/audio/speech</span>
                    <span style="color: var(--text-secondary); font-size: 0.8em;">文字转语音</span>
                </div>
                <div class="endpoint-item">
                    <span class="endpoint-method method-post">POST</span>
                    <span class="endpoint-path">/v1/audio/transcriptions</span>
                    <span style="color: var(--text-secondary); font-size: 0.8em;">语音转文字</span>
                </div>
                <div class="endpoint-item">
                    <span class="endpoint-method method-get">GET</span>
                    <span class="endpoint-path">/v1/models</span>
                    <span style="color: var(--text-secondary); font-size: 0.8em;">模型列表</span>
                </div>
            </div>
        </div>

        <div class="status-card" id="models-card">
            <div class="card-header">
                <span class="card-title">🤖 可用模型</span>
            </div>
            <div class="models-section">
                <div class="model-tags" id="model-tags-container">
                    <span style="color: var(--text-secondary);">加载中...</span>
                </div>
            </div>
        </div>

        <!-- API 调用文档 -->
        <div id="api-docs" style="max-width: 900px; margin: 40px auto; padding: 30px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; color: #e0e0e0; font-family: 'Segoe UI', system-ui, sans-serif; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
            <h2 style="text-align: center; color: #7c83ff; margin-bottom: 10px; font-size: 28px;">📡 API 调用文档</h2>
            <p style="text-align: center; color: #999; margin-bottom: 30px; font-size: 14px;">支持文字转语音 & 语音转文字，兼容 OpenAI 接口格式</p>

            <!-- 文字转语音 -->
            <div style="background: #0f3460; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #1a508b;">
                <h3 style="color: #51cf66; margin: 0 0 8px 0; font-size: 20px;">🎙️ 文字转语音 (TTS)</h3>
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

            <!-- 语音转文字 -->
            <div style="background: #0f3460; border-radius: 12px; padding: 24px; border: 1px solid #1a508b;">
                <h3 style="color: #45aaf2; margin: 0 0 8px 0; font-size: 20px;">🎧 语音转文字 (STT)</h3>
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

        <footer>
            <p>Powered by Cloudflare Workers | 多模型 API 转发服务</p>
        </footer>
    </div>

    <script>
        (function() {
            const workerUrl = location.origin;
            document.getElementById('worker-url').textContent = workerUrl;

            fetch('/v1/models')
                .then(res => res.json())
                .then(data => {
                    const models = data.data || [];
                    document.getElementById('model-count').textContent = models.length;
                    
                    const container = document.getElementById('model-tags-container');
                    if (models.length > 0) {
                        container.innerHTML = models.map(m => 
                            '<span class="model-tag">' + (m.id || m) + '</span>'
                        ).join('');
                    } else {
                        container.innerHTML = '<span style="color: var(--text-secondary);">暂无模型</span>';
                    }

                    // 检查 token 数量
                    if (data.token_count !== undefined) {
                        document.getElementById('token-count').textContent = data.token_count;
                    }
                    if (data.api_key_set !== undefined && data.api_key_set) {
                        document.getElementById('api-key-display').textContent = '已设置 ✅';
                    }
                })
                .catch(() => {
                    document.getElementById('model-count').textContent = '加载失败';
                    document.getElementById('model-tags-container').innerHTML = '<span style="color: var(--accent-red);">加载失败</span>';
                });
        })();
    </script>
</body>
</html>
`;

// ============================================================================
// Token 和模型初始化
// ============================================================================

function initTokensAndModels() {
    ALL_TOKENS = [];
    ALL_MODELS = [];
    
    const tokenConfigs = [
        { prefix: 'DEEPSEEK', defaultModel: 'deepseek-ai/DeepSeek-V3' },
        { prefix: 'SILICONFLOW', defaultModel: 'deepseek-ai/DeepSeek-V3' },
        { prefix: 'API_KEY', defaultModel: null },
    ];
    
    tokenConfigs.forEach(({ prefix, defaultModel }) => {
        for (let i = 1; i <= 20; i++) {
            const key = `${prefix}_${i}`;
            const val = getEnv(key);
            if (val && val.trim()) {
                ALL_TOKENS.push({ token: val.trim(), prefix, index: i, defaultModel });
            }
        }
    });
    
    const modelStr = getEnv('MODELS') || 
        'deepseek-ai/DeepSeek-V3,deepseek-ai/DeepSeek-R1,deepseek-ai/DeepSeek-R1-0528,Qwen/Qwen3-235B-A22B,moonshot-v1-8k,moonshot-v1-32k,moonshot-v1-128k,Pro/zai-org/GLM-4.5,Qwen/Qwen2.5-7B-Instruct,THUDM/glm-4-9b-chat,zai-org/GLM-4.5';
    
    ALL_MODELS = modelStr.split(',').map(m => m.trim()).filter(m => m);
    
    if (ALL_TOKENS.length === 0) {
        const fallback = getEnv('API_KEY');
        if (fallback && fallback.trim()) {
            ALL_TOKENS.push({ token: fallback.trim(), prefix: 'API_KEY', index: 1, defaultModel: null });
        }
    }
}

// ============================================================================
// Token 轮换
// ============================================================================

let tokenIndex = 0;

function getNextToken() {
    if (ALL_TOKENS.length === 0) return null;
    const t = ALL_TOKENS[tokenIndex % ALL_TOKENS.length];
    tokenIndex = (tokenIndex + 1) % ALL_TOKENS.length;
    return t;
}

// ============================================================================
// 模型匹配
// ============================================================================

function findModel(requested) {
    if (!requested) return ALL_MODELS[0] || 'deepseek-ai/DeepSeek-V3';
    
    const r = requested.trim();
    const exact = ALL_MODELS.find(m => m === r);
    if (exact) return exact;
    if (ALL_MODELS.includes(r)) return r;
    
    const lower = r.toLowerCase();
    const fuzzy = ALL_MODELS.find(m => m.toLowerCase() === lower);
    if (fuzzy) return fuzzy;
    
    const partial = ALL_MODELS.find(m => m.toLowerCase().includes(lower) || lower.includes(m.toLowerCase()));
    if (partial) return partial;
    
    return r;
}

// ============================================================================
// 聊天补全处理
// ============================================================================

async function handleChatCompletions(request, envVars) {
    const url = new URL(request.url);
    const authHeader = request.headers.get('Authorization') || '';
    const userApiKey = authHeader.replace(/^Bearer\s+/i, '').trim();
    const body = await request.json();
    const requestedModel = body.model;
    
    let selectedToken = null;
    
    if (userApiKey && userApiKey !== 'none' && userApiKey !== '') {
        selectedToken = { token: userApiKey, prefix: 'USER', index: 0, defaultModel: null };
    } else {
        selectedToken = getNextToken();
        if (!selectedToken) {
            return new Response(JSON.stringify({
                error: '未配置任何 API Token，请设置环境变量。'
            }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
    }
    
    const resolvedModel = findModel(requestedModel);
    
    let apiUrl;
    if (selectedToken.prefix === 'DEEPSEEK') {
        apiUrl = 'https://api.deepseek.com/v1/chat/completions';
    } else if (selectedToken.prefix === 'SILICONFLOW') {
        apiUrl = 'https://api.siliconflow.cn/v1/chat/completions';
    } else {
        apiUrl = 'https://api.siliconflow.cn/v1/chat/completions';
    }
    
    const modifiedBody = { ...body, model: resolvedModel };
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${selectedToken.token}`,
    };
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(modifiedBody),
    });
    
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('X-Used-Model', resolvedModel);
    responseHeaders.set('X-Token-Prefix', selectedToken.prefix);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    
    return new Response(response.body, {
        status: response.status,
        headers: responseHeaders,
    });
}

// ============================================================================
// 文字转语音 (TTS)
// ============================================================================

async function handleTextToSpeech(request, envVars) {
    const body = await request.json();
    const input = body.input || '';
    const voice = body.voice || 'zh-CN-XiaoxiaoNeural';
    const speed = body.speed || 1.0;
    const pitch = body.pitch || '0';
    const style = body.style || 'general';
    
    if (!input) {
        return new Response(JSON.stringify({ error: '缺少 input 参数' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    
    // 使用 SiliconFlow 的 TTS API
    const ttsToken = getEnv('SILICONFLOW_1') || getEnv('API_KEY') || '';
    if (!ttsToken) {
        return new Response(JSON.stringify({ error: '未配置 SiliconFlow Token' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    
    const apiUrl = 'https://api.siliconflow.cn/v1/audio/speech';
    
    const requestBody = {
        model: 'FunAudioLLM/CosyVoice2-0.5B',
        input: input,
        voice: `${voice}:${style}:${speed}:${pitch}`,
        response_format: 'mp3',
    };
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ttsToken}`,
        },
        body: JSON.stringify(requestBody),
    });
    
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    
    return new Response(response.body, {
        status: response.status,
        headers: responseHeaders,
    });
}

// ============================================================================
// 语音转文字 (STT)
// ============================================================================

async function handleSpeechToText(request, envVars) {
    const formData = await request.formData();
    const audioFile = formData.get('file');
    const userToken = formData.get('token');
    
    if (!audioFile) {
        return new Response(JSON.stringify({ error: '缺少 file 参数（音频文件）' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    
    // 使用用户提供的 token 或默认 SiliconFlow token
    const sttToken = userToken || getEnv('SILICONFLOW_1') || getEnv('API_KEY') || '';
    if (!sttToken) {
        return new Response(JSON.stringify({ error: '未配置 SiliconFlow Token' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    
    const apiUrl = 'https://api.siliconflow.cn/v1/audio/transcriptions';
    
    const siliconFormData = new FormData();
    siliconFormData.append('file', audioFile);
    siliconFormData.append('model', 'FunAudioLLM/SenseVoiceSmall');
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${sttToken}`,
        },
        body: siliconFormData,
    });
    
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    
    return new Response(response.body, {
        status: response.status,
        headers: responseHeaders,
    });
}

// ============================================================================
// 模型列表
// ============================================================================

function handleModels() {
    const models = ALL_MODELS.map(m => ({
        id: m,
        object: 'model',
        created: 1700000000,
        owned_by: 'cloudflare-worker',
    }));
    
    return new Response(JSON.stringify({
        object: 'list',
        data: models,
        token_count: ALL_TOKENS.length,
        api_key_set: ALL_TOKENS.length > 0,
    }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    });
}

// ============================================================================
// 主请求处理
// ============================================================================

async function handleRequest(request, envVars) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    // CORS 预检
    if (method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }
    
    // GET / - 首页
    if (path === '/' && method === 'GET') {
        return new Response(HTML_PAGE, {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
    }
    
    // GET /v1/models - 模型列表
    if (path === '/v1/models' && method === 'GET') {
        return handleModels();
    }
    
    // POST /v1/chat/completions - 聊天补全
    if (path === '/v1/chat/completions' && method === 'POST') {
        return handleChatCompletions(request, envVars);
    }
    
    // POST /v1/audio/speech - 文字转语音
    if (path === '/v1/audio/speech' && method === 'POST') {
        return handleTextToSpeech(request, envVars);
    }
    
    // POST /v1/audio/transcriptions - 语音转文字
    if (path === '/v1/audio/transcriptions' && method === 'POST') {
        return handleSpeechToText(request, envVars);
    }
    
    // 404
    return new Response(JSON.stringify({
        error: '未找到请求的端点',
        path: path,
        available_endpoints: [
            'GET /',
            'GET /v1/models',
            'POST /v1/chat/completions',
            'POST /v1/audio/speech',
            'POST /v1/audio/transcriptions',
        ],
    }), {
        status: 404,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    });
}

// ============================================================================
// Worker 入口
// ============================================================================

export default {
    async fetch(request, env) {
        initTokensAndModels();
        return handleRequest(request, env);
    },
};
