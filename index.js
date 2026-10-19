// ============================================================
// VoiceCraft - Cloudflare Worker AI语音处理平台
// 文字转语音 / 语音转文字
// ============================================================

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        // CORS 预检请求
        if (method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Max-Age': '86400',
                }
            });
        }

        // 路由处理
        try {
            // 首页 - 返回 HTML 页面
            if (path === '/' && method === 'GET') {
                return new Response(HTML_PAGE, {
                    headers: {
                        'Content-Type': 'text/html; charset=utf-8',
                        'Access-Control-Allow-Origin': '*',
                        'Cache-Control': 'public, max-age=3600',
                    }
                });
            }

            // 文字转语音 API
            if (path === '/v1/audio/speech' && method === 'POST') {
                return handleTextToSpeech(request, env);
            }

            // 语音转文字 API
            if (path === '/v1/audio/transcriptions' && method === 'POST') {
                return handleSpeechToText(request, env);
            }

            // 404
            return new Response(JSON.stringify({
                error: 'Not Found',
                message: `路径 ${path} 不存在`,
                endpoints: [
                    'GET / - 首页',
                    'POST /v1/audio/speech - 文字转语音',
                    'POST /v1/audio/transcriptions - 语音转文字',
                ]
            }), {
                status: 404,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                }
            });

        } catch (error) {
            console.error('Worker 错误:', error);
            return new Response(JSON.stringify({
                error: 'Internal Server Error',
                message: error.message
            }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                }
            });
        }
    }
};

// ============================================================
// 文字转语音处理
// ============================================================
async function handleTextToSpeech(request, env) {
    const contentType = request.headers.get('Content-Type') || '';

    let text, voice, speed, pitch, style;

    if (contentType.includes('application/json')) {
        const body = await request.json();
        text = body.text || body.input || '';
        voice = body.voice || 'zh-CN-XiaoxiaoNeural';
        speed = body.speed || body.rate || 1.0;
        pitch = body.pitch || 0;
        style = body.style || 'general';
    } else if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        text = formData.get('text') || formData.get('input') || '';
        voice = formData.get('voice') || 'zh-CN-XiaoxiaoNeural';
        speed = parseFloat(formData.get('speed') || formData.get('rate') || '1.0');
        pitch = parseFloat(formData.get('pitch') || '0');
        style = formData.get('style') || 'general';
    } else {
        return new Response(JSON.stringify({
            error: '不支持的 Content-Type',
            message: '请使用 application/json 或 multipart/form-data'
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
        });
    }

    // 参数校验
    if (!text || text.trim().length === 0) {
        return new Response(JSON.stringify({
            error: '参数错误',
            message: 'text 参数不能为空'
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
        });
    }

    if (text.length > 3000) {
        return new Response(JSON.stringify({
            error: '参数错误',
            message: '文本长度不能超过 3000 字符'
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
        });
    }

    // 语音参数校验
    const validVoices = [
        'zh-CN-XiaoxiaoNeural', 'zh-CN-YunxiNeural', 'zh-CN-YunyangNeural',
        'zh-CN-XiaoyiNeural', 'zh-CN-YunjianNeural', 'zh-CN-XiaochenNeural',
        'zh-CN-XiaohanNeural', 'zh-CN-XiaomengNeural', 'zh-CN-XiaomoNeural',
        'zh-CN-XiaoqiuNeural', 'zh-CN-XiaoruiNeural', 'zh-CN-XiaoshuangNeural',
        'zh-CN-XiaoxuanNeural', 'zh-CN-XiaoyanNeural', 'zh-CN-XiaoyouNeural',
        'zh-CN-XiaozhenNeural', 'zh-TW-HsiaoChenNeural', 'zh-TW-HsiaoYuNeural',
        'zh-TW-YunJheNeural', 'zh-HK-HiuMaanNeural'
    ];
    if (!validVoices.includes(voice)) {
        return new Response(JSON.stringify({
            error: '参数错误',
            message: `不支持的语音: ${voice}`
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
        });
    }

    speed = Math.max(0.5, Math.min(2.0, parseFloat(speed)));
    pitch = Math.max(-50, Math.min(50, parseInt(pitch)));

    const validStyles = ['general', 'assistant', 'chat', 'customerservice', 'newscast', 'affectionate', 'angry', 'calm', 'cheerful', 'disgruntled', 'embarrassed', 'fearful', 'gentle', 'sad', 'serious'];
    if (!validStyles.includes(style)) {
        style = 'general';
    }

    try {
        // 获取 Edge TTS endpoint
        const endpoint = await getEdgeTTSEndpoint(env);

        // 文本分块
        const chunks = splitText(text, 1500);
        const audioBuffers = [];

        // 批量处理
        for (let i = 0; i < chunks.length; i += 3) {
            const batch = chunks.slice(i, i + 3);
            const batchResults = await Promise.all(
                batch.map(async (chunk, idx) => {
                    const ssml = buildSSML(chunk, voice, speed, pitch, style);
                    return await synthesizeWithRetry(endpoint, ssml, 3);
                })
            );
            audioBuffers.push(...batchResults);

            if (i + 3 < chunks.length) {
                await new Promise(resolve => setTimeout(resolve, 800));
            }
        }

        // 合并音频
        const finalAudio = mergeAudioBuffers(audioBuffers);

        return new Response(finalAudio, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Access-Control-Allow-Origin': '*',
                'X-Chunks-Count': chunks.length.toString(),
            }
        });

    } catch (error) {
        console.error('TTS 错误:', error);
        return new Response(JSON.stringify({
            error: '语音合成失败',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
        });
    }
}

// ============================================================
// 语音转文字处理 (SiliconFlow SenseVoice)
// ============================================================
async function handleSpeechToText(request, env) {
    const contentType = request.headers.get('Content-Type') || '';
    let audioData, language = 'zh', apiKey;

    if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        const file = formData.get('file') || formData.get('audio');
        if (!file || !(file instanceof File)) {
            return new Response(JSON.stringify({
                error: '参数错误',
                message: '请上传音频文件（file 字段）'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 文件大小限制 10MB
        if (file.size > 10 * 1024 * 1024) {
            return new Response(JSON.stringify({
                error: '参数错误',
                message: '音频文件不能超过 10MB'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
            });
        }

        audioData = await file.arrayBuffer();
        language = formData.get('language') || 'zh';
        apiKey = formData.get('api_key') || env.SILICONFLOW_API_KEY || '';

    } else if (contentType.includes('application/json')) {
        const body = await request.json();
        if (!body.file && !body.audio) {
            return new Response(JSON.stringify({
                error: '参数错误',
                message: '请提供 file（base64编码的音频）或 audio 字段'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
            });
        }

        const base64Data = body.file || body.audio;
        const base64 = base64Data.replace(/^data:audio\/[^;]+;base64,/, '');
        try {
            audioData = Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer;
        } catch (e) {
            return new Response(JSON.stringify({
                error: '参数错误',
                message: '无效的 base64 编码'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
            });
        }

        if (audioData.byteLength > 10 * 1024 * 1024) {
            return new Response(JSON.stringify({
                error: '参数错误',
                message: '音频文件不能超过 10MB'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
            });
        }

        language = body.language || 'zh';
        apiKey = body.api_key || env.SILICONFLOW_API_KEY || '';
    } else {
        return new Response(JSON.stringify({
            error: '不支持的 Content-Type',
            message: '请使用 multipart/form-data 或 application/json'
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
        });
    }

    // 使用默认 API Key
    if (!apiKey) {
        apiKey = 'sk-sfoqgshjrapaxdjdamblbrcpsdqswnqxmlplexopepwasagy';
    }

    try {
        // 构建 FormData 发送到 SiliconFlow
        const siliconFlowFormData = new FormData();
        const blob = new Blob([audioData], { type: 'audio/wav' });
        siliconFlowFormData.append('file', blob, 'audio.wav');
        siliconFlowFormData.append('model', 'FunAudioLLM/SenseVoiceSmall');

        const response = await fetch('https://api.siliconflow.cn/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
            body: siliconFlowFormData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('SiliconFlow API 错误:', response.status, errorText);
            return new Response(JSON.stringify({
                error: '语音识别失败',
                message: `SiliconFlow API 返回错误 (${response.status}): ${errorText}`
            }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
            });
        }

        const result = await response.json();

        return new Response(JSON.stringify({
            text: result.text || '',
            language: language,
            model: 'FunAudioLLM/SenseVoiceSmall',
        }), {
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
            }
        });

    } catch (error) {
        console.error('STT 错误:', error);
        return new Response(JSON.stringify({
            error: '语音识别失败',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
        });
    }
}

// ============================================================
// Edge TTS Endpoint 获取
// ============================================================
let cachedEndpoint = null;
let endpointExpiry = 0;

async function getEdgeTTSEndpoint(env) {
    const now = Date.now();
    if (cachedEndpoint && now < endpointExpiry) {
        return cachedEndpoint;
    }

    const key = env.MICROSOFT_TRANSLATOR_KEY || '3eb19a9ee8da469496b5f92b4f0dd12e';
    const region = env.MICROSOFT_REGION || 'eastus';
    const endpoint = env.MICROSOFT_ENDPOINT || 'https://eastus.api.cognitive.microsoft.com/sts/v1.0/issueToken';

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': key,
                'Ocp-Apim-Subscription-Region': region,
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('获取 Token 失败:', response.status, errorText);
            throw new Error(`获取 Token 失败 (${response.status}): ${errorText}`);
        }

        const token = await response.text();

        // 使用签名算法生成最终 endpoint
        const signature = await generateSignature(token);
        const ttsEndpoint = `https://eastus.tts.speech.microsoft.com/cognitiveservices/v1?${signature}`;

        cachedEndpoint = ttsEndpoint;
        endpointExpiry = now + 9 * 60 * 1000; // 9 分钟后过期（提前刷新）

        return ttsEndpoint;
    } catch (error) {
        console.error('获取 Endpoint 错误:', error);
        throw error;
    }
}

// ============================================================
// 签名生成
// ============================================================
async function generateSignature(token) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(token);

    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const url = 'https://eastus.tts.speech.microsoft.com/cognitiveservices/v1';
    const timestamp = new Date().toUTCString();
    const host = 'eastus.tts.speech.microsoft.com';
    const stringToSign = `POST\n${host}\n/cognitiveservices/v1\n${timestamp}`;

    const signature = await crypto.subtle.sign(
        'HMAC',
        cryptoKey,
        encoder.encode(stringToSign)
    );

    const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));

    return `Authorization=bearer ${encodeURIComponent(token)}&X-Ms-Date=${encodeURIComponent(timestamp)}&Host=${encodeURIComponent(host)}&X-Ms-Signature=${encodeURIComponent(base64Signature)}`;
}

// ============================================================
// 文本分块
// ============================================================
function splitText(text, maxLen) {
    const chunks = [];
    const sentences = text.match(/[^。！？!?\n]+[。！？!?\n]?/g) || [text];

    let currentChunk = '';
    for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxLen && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = sentence;
        } else {
            currentChunk += sentence;
        }
    }
    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text];
}

// ============================================================
// SSML 构建
// ============================================================
function buildSSML(text, voice, speed, pitch, style) {
    const rate = speed * 100;
    const pitchHz = pitch > 0 ? `+${pitch}Hz` : `${pitch}Hz`;

    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="zh-CN">
        <voice name="${voice}">
            <mstts:express-as style="${style}">
                <prosody rate="${rate}%" pitch="${pitchHz}">
                    ${escapeXml(text)}
                </prosody>
            </mstts:express-as>
        </voice>
    </speak>`;
}

function escapeXml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// ============================================================
// 语音合成（带重试）
// ============================================================
async function synthesizeWithRetry(endpoint, ssml, maxRetries) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/ssml+xml',
                    'X-Microsoft-OutputFormat': 'audio-24khz-160kbitrate-mono-mp3',
                    'User-Agent': 'VoiceCraft/1.0',
                },
                body: ssml,
            });

            if (response.ok) {
                return await response.arrayBuffer();
            }

            if (response.status === 429 || response.status >= 500) {
                const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
                console.warn(`合成失败 (${response.status})，${delay}ms 后重试 (${attempt + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            const errorText = await response.text();
            throw new Error(`合成失败 (${response.status}): ${errorText}`);

        } catch (error) {
            if (attempt === maxRetries - 1) throw error;
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error('语音合成重试次数已用完');
}

// ============================================================
// 音频合并
// ============================================================
function mergeAudioBuffers(buffers) {
    if (buffers.length === 1) return buffers[0];

    const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;

    for (const buf of buffers) {
        merged.set(new Uint8Array(buf), offset);
        offset += buf.byteLength;
    }

    return merged.buffer;
}

// ============================================================
// HTML 页面模板
// ============================================================
const HTML_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VoiceCraft - AI 语音处理平台</title>
    <style>
        :root {
            --bg: #0d1117;
            --card-bg: #161b22;
            --border: #30363d;
            --text: #c9d1d9;
            --text-secondary: #8b949e;
            --accent: #58a6ff;
            --accent-hover: #79c0ff;
            --success: #3fb950;
            --danger: #f85149;
            --warning: #d2991d;
            --radius: 12px;
            --shadow: 0 4px 24px rgba(0,0,0,0.3);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            line-height: 1.6;
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
        }

        /* Header */
        .header {
            text-align: center;
            padding: 32px 0 16px;
        }
        .header .logo {
            font-size: 48px;
            margin-bottom: 8px;
        }
        .header h1 {
            font-size: 28px;
            font-weight: 700;
            background: linear-gradient(135deg, #58a6ff, #bc8cff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .header .subtitle {
            color: var(--text-secondary);
            font-size: 14px;
            margin-top: 4px;
        }

        /* 主功能切换器 */
        .mode-switcher {
            display: flex;
            justify-content: center;
            gap: 8px;
            margin-bottom: 24px;
            background: var(--card-bg);
            border-radius: 12px;
            padding: 6px;
            border: 1px solid var(--border);
        }
        .mode-switcher button {
            flex: 1;
            max-width: 200px;
            padding: 10px 16px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            background: transparent;
            color: var(--text-secondary);
            transition: all 0.25s ease;
            white-space: nowrap;
        }
        .mode-switcher button .icon {
            margin-right: 4px;
        }
        .mode-switcher button.active {
            background: var(--accent);
            color: #fff;
            box-shadow: 0 2px 12px rgba(88,166,255,0.3);
        }
        .mode-switcher button:not(.active):hover {
            color: var(--text);
            background: rgba(88,166,255,0.08);
        }

        /* 卡片 */
        .card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 24px;
            margin-bottom: 20px;
            box-shadow: var(--shadow);
        }
        .card h2 {
            font-size: 18px;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        /* 表单元素 */
        textarea {
            width: 100%;
            min-height: 140px;
            padding: 14px;
            background: #0d1117;
            border: 1px solid var(--border);
            border-radius: 8px;
            color: var(--text);
            font-size: 14px;
            font-family: inherit;
            resize: vertical;
            transition: border-color 0.2s;
        }
        textarea:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 0 3px rgba(88,166,255,0.1);
        }
        textarea::placeholder {
            color: #484f58;
        }

        .char-count {
            text-align: right;
            font-size: 12px;
            color: var(--text-secondary);
            margin-top: 4px;
        }

        /* 参数行 */
        .param-row {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin-top: 14px;
        }
        .param-group {
            flex: 1;
            min-width: 140px;
        }
        .param-group label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: var(--text-secondary);
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        select, input[type="range"] {
            width: 100%;
            padding: 8px 10px;
            background: #0d1117;
            border: 1px solid var(--border);
            border-radius: 6px;
            color: var(--text);
            font-size: 13px;
            font-family: inherit;
        }
        select:focus {
            outline: none;
            border-color: var(--accent);
        }
        input[type="range"] {
            padding: 0;
            height: 6px;
            -webkit-appearance: none;
            appearance: none;
            background: var(--border);
            border: none;
            cursor: pointer;
        }
        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            background: var(--accent);
            border-radius: 50%;
            cursor: pointer;
        }
        .range-labels {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: var(--text-secondary);
            margin-top: 2px;
        }

        /* 按钮 */
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 10px 24px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            font-family: inherit;
        }
        .btn-primary {
            background: var(--accent);
            color: #fff;
            width: 100%;
            margin-top: 16px;
        }
        .btn-primary:hover {
            background: var(--accent-hover);
            box-shadow: 0 4px 16px rgba(88,166,255,0.3);
        }
        .btn-primary:disabled {
            background: #21262d;
            color: #484f58;
            cursor: not-allowed;
            box-shadow: none;
        }
        .btn-sm {
            padding: 6px 14px;
            font-size: 12px;
            border-radius: 6px;
        }
        .btn-outline {
            background: transparent;
            border: 1px solid var(--border);
            color: var(--text);
        }
        .btn-outline:hover {
            border-color: var(--accent);
            color: var(--accent);
        }

        /* 结果区域 */
        .result-area {
            display: none;
            margin-top: 16px;
        }
        .result-area.show {
            display: block;
        }
        .audio-player {
            width: 100%;
            margin-top: 12px;
            border-radius: 8px;
        }
        .transcription-result {
            background: #0d1117;
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 16px;
            font-size: 14px;
            white-space: pre-wrap;
            min-height: 60px;
            margin-top: 12px;
        }

        /* 加载动画 */
        .spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: #fff;
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* 文件上传 */
        .upload-zone {
            border: 2px dashed var(--border);
            border-radius: 10px;
            padding: 32px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
            color: var(--text-secondary);
            font-size: 14px;
        }
        .upload-zone:hover, .upload-zone.drag-over {
            border-color: var(--accent);
            background: rgba(88,166,255,0.04);
            color: var(--accent);
        }
        .upload-zone .upload-icon {
            font-size: 36px;
            display: block;
            margin-bottom: 8px;
        }
        .upload-zone input {
            display: none;
        }
        .file-info {
            margin-top: 10px;
            font-size: 12px;
            color: var(--success);
            display: none;
        }
        .file-info.show {
            display: block;
        }

        /* 状态提示 */
        .toast {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 10px 24px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s;
            pointer-events: none;
        }
        .toast.show {
            opacity: 1;
        }
        .toast.success { background: #1a3a2a; color: var(--success); border: 1px solid var(--success); }
        .toast.error { background: #3a1a1a; color: var(--danger); border: 1px solid var(--danger); }
        .toast.info { background: #1a2a3a; color: var(--accent); border: 1px solid var(--accent); }

        /* Footer */
        .footer {
            text-align: center;
            padding: 24px;
            color: var(--text-secondary);
            font-size: 12px;
        }
        .footer a {
            color: var(--accent);
            text-decoration: none;
        }
        .footer a:hover {
            text-decoration: underline;
        }

        /* API 文档面板 */
        #apiDocPanel {
            display: none;
        }
        #apiDocPanel .doc-section {
            margin-bottom: 24px;
        }
        #apiDocPanel .doc-section h3 {
            font-size: 16px;
            margin-bottom: 10px;
            color: var(--accent);
            display: flex;
            align-items: center;
            gap: 6px;
        }
        #apiDocPanel .doc-section h4 {
            font-size: 14px;
            margin: 12px 0 6px;
            color: var(--text);
        }
        #apiDocPanel pre {
            background: #0d1117;
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 16px;
            overflow-x: auto;
            font-size: 12px;
            font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
            line-height: 1.5;
            color: #e6edf3;
            margin: 8px 0;
        }
        #apiDocPanel code {
            font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
            font-size: 12px;
        }
        #apiDocPanel .param-table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0 16px;
            font-size: 13px;
        }
        #apiDocPanel .param-table th,
        #apiDocPanel .param-table td {
            padding: 8px 12px;
            border: 1px solid var(--border);
            text-align: left;
        }
        #apiDocPanel .param-table th {
            background: #21262d;
            font-weight: 600;
            color: var(--text);
            font-size: 12px;
        }
        #apiDocPanel .param-table td {
            color: var(--text-secondary);
        }
        #apiDocPanel .param-table td:first-child {
            color: var(--accent);
            font-family: 'SF Mono', 'Fira Code', monospace;
        }
        #apiDocPanel .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 600;
        }
        #apiDocPanel .badge-required {
            background: rgba(248,81,73,0.15);
            color: var(--danger);
        }
        #apiDocPanel .badge-optional {
            background: rgba(139,148,158,0.15);
            color: var(--text-secondary);
        }
        #apiDocPanel .endpoint-box {
            display: flex;
            align-items: center;
            gap: 8px;
            background: #0d1117;
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 10px 14px;
            margin: 8px 0;
            font-family: 'SF Mono', 'Fira Code', monospace;
            font-size: 13px;
        }
        #apiDocPanel .method-tag {
            padding: 3px 10px;
            border-radius: 4px;
            font-weight: 700;
            font-size: 11px;
            text-transform: uppercase;
        }
        #apiDocPanel .method-post {
            background: rgba(63,185,80,0.15);
            color: #3fb950;
        }
        #apiDocPanel .method-get {
            background: rgba(88,166,255,0.15);
            color: #58a6ff;
        }

        /* 响应式 */
        @media (max-width: 768px) {
            .container { padding: 12px; }
            .header { padding: 20px 0 8px; }
            .header h1 { font-size: 22px; }
            .mode-switcher { gap: 4px; padding: 4px; }
            .mode-switcher button { font-size: 11px; padding: 8px 10px; max-width: none; }
            .param-row { flex-direction: column; gap: 8px; }
            .card { padding: 16px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="logo">🎙️</div>
            <h1>VoiceCraft</h1>
            <p class="subtitle">AI 语音处理平台 · 文字转语音 & 语音转文字</p>
        </div>

        <!-- 主功能切换器 -->
        <div class="mode-switcher">
            <button id="ttsModeBtn" class="active" onclick="switchMode('tts')">
                <span class="icon">🔊</span> 文字转语音
            </button>
            <button id="transcriptionModeBtn" onclick="switchMode('transcription')">
                <span class="icon">🎤</span> 语音转文字
            </button>
            <button id="apiDocModeBtn" onclick="switchMode('apiDoc')">
                <span class="icon">📡</span> API 文档
            </button>
        </div>

        <!-- ==================== 文字转语音面板 ==================== -->
        <div id="ttsPanel">
            <div class="card">
                <h2>📝 输入文本</h2>
                <textarea id="ttsText" placeholder="请输入要转换的文字内容...（最多 3000 字符）" maxlength="3000"></textarea>
                <div class="char-count"><span id="ttsCharCount">0</span> / 3000</div>

                <div class="param-row">
                    <div class="param-group">
                        <label>🎙️ 语音角色</label>
                        <select id="ttsVoice">
                            <option value="zh-CN-XiaoxiaoNeural">晓晓 (女·温柔)</option>
                            <option value="zh-CN-YunxiNeural">云希 (男·年轻)</option>
                            <option value="zh-CN-YunyangNeural" selected>云扬 (男·新闻)</option>
                            <option value="zh-CN-XiaoyiNeural">晓伊 (女·活泼)</option>
                            <option value="zh-CN-YunjianNeural">云健 (男·运动)</option>
                            <option value="zh-CN-XiaochenNeural">晓辰 (女·自然)</option>
                            <option value="zh-CN-XiaohanNeural">晓涵 (女·温柔)</option>
                            <option value="zh-CN-XiaomengNeural">晓梦 (女·可爱)</option>
                            <option value="zh-CN-XiaomoNeural">晓墨 (女·知性)</option>
                            <option value="zh-CN-XiaoqiuNeural">晓秋 (女·成熟)</option>
                            <option value="zh-CN-XiaoruiNeural">晓睿 (女·冷静)</option>
                            <option value="zh-CN-XiaoshuangNeural">晓双 (女·童声)</option>
                            <option value="zh-CN-XiaoxuanNeural">晓萱 (女·自信)</option>
                            <option value="zh-CN-XiaoyanNeural">晓燕 (女·温和)</option>
                            <option value="zh-CN-XiaoyouNeural">晓悠 (女·舒缓)</option>
                            <option value="zh-CN-XiaozhenNeural">晓臻 (女·标准)</option>
                            <option value="zh-TW-HsiaoChenNeural">晓辰 (台·女)</option>
                            <option value="zh-TW-HsiaoYuNeural">晓雨 (台·女)</option>
                            <option value="zh-TW-YunJheNeural">云哲 (台·男)</option>
                            <option value="zh-HK-HiuMaanNeural">晓曼 (粤·女)</option>
                        </select>
                    </div>
                    <div class="param-group">
                        <label>⚡ 语速</label>
                        <select id="ttsSpeed">
                            <option value="0.5">0.5x (很慢)</option>
                            <option value="0.75">0.75x (较慢)</option>
                            <option value="1.0" selected>1.0x (正常)</option>
                            <option value="1.25">1.25x (较快)</option>
                            <option value="1.5">1.5x (快)</option>
                            <option value="2.0">2.0x (很快)</option>
                        </select>
                    </div>
                    <div class="param-group">
                        <label>🎵 音调</label>
                        <select id="ttsPitch">
                            <option value="-50">-50Hz (很低)</option>
                            <option value="-25">-25Hz (较低)</option>
                            <option value="0" selected>0Hz (默认)</option>
                            <option value="25">+25Hz (较高)</option>
                            <option value="50">+50Hz (很高)</option>
                        </select>
                    </div>
                </div>

                <div class="param-row" style="margin-top: 12px;">
                    <div class="param-group">
                        <label>🎭 语音风格</label>
                        <select id="ttsStyle">
                            <option value="general">通用</option>
                            <option value="assistant">助手</option>
                            <option value="chat">聊天</option>
                            <option value="customerservice">客服</option>
                            <option value="newscast">新闻播报</option>
                            <option value="affectionate">深情</option>
                            <option value="angry">愤怒</option>
                            <option value="calm">平静</option>
                            <option value="cheerful">欢快</option>
                            <option value="disgruntled">不满</option>
                            <option value="embarrassed">尴尬</option>
                            <option value="fearful">害怕</option>
                            <option value="gentle">温柔</option>
                            <option value="sad">悲伤</option>
                            <option value="serious">严肃</option>
                        </select>
                    </div>
                </div>

                <button class="btn btn-primary" id="ttsGenerateBtn" onclick="generateSpeech()">
                    🔊 生成语音
                </button>

                <div class="result-area" id="ttsResult">
                    <audio class="audio-player" id="ttsAudio" controls></audio>
                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                        <button class="btn btn-sm btn-outline" onclick="downloadAudio()">💾 下载 MP3</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ==================== 语音转文字面板 ==================== -->
        <div id="transcriptionPanel" style="display: none;">
            <div class="card">
                <h2>🎤 上传音频</h2>
                <div class="upload-zone" id="uploadZone" onclick="document.getElementById('audioFile').click()">
                    <span class="upload-icon">📁</span>
                    <p>点击上传或拖拽音频文件到此处</p>
                    <p style="font-size: 11px; margin-top: 4px;">支持 WAV / MP3 / FLAC / OGG / M4A / WEBM，最大 10MB</p>
                    <input type="file" id="audioFile" accept="audio/*,.wav,.mp3,.flac,.ogg,.m4a,.webm" onchange="handleFileSelect(event)">
                </div>
                <div class="file-info" id="fileInfo"></div>

                <button class="btn btn-primary" id="sttTranscribeBtn" onclick="transcribeAudio()" disabled>
                    🎯 开始识别
                </button>

                <div class="result-area" id="sttResult">
                    <h3 style="font-size: 14px; margin-bottom: 8px; color: var(--text-secondary);">📝 识别结果</h3>
                    <div class="transcription-result" id="sttText"></div>
                </div>
            </div>
        </div>

        <!-- ==================== API 文档面板 ==================== -->
        <div id="apiDocPanel" style="display: none;">
            <!-- 概述 -->
            <div class="card">
                <h2>📡 API 概述</h2>
                <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 12px;">
                    VoiceCraft 提供两个核心 API 端点：文字转语音 (TTS) 和语音转文字 (STT)。
                    所有 API 均支持 JSON 和 FormData 两种请求格式，无认证要求（可选 API Key）。
                </p>
                <div class="endpoint-box">
                    <span class="method-tag method-post">POST</span>
                    <span style="color: var(--text);">/v1/audio/speech</span>
                    <span style="color: var(--text-secondary); margin-left: auto;">文字转语音</span>
                </div>
                <div class="endpoint-box">
                    <span class="method-tag method-post">POST</span>
                    <span style="color: var(--text);">/v1/audio/transcriptions</span>
                    <span style="color: var(--text-secondary); margin-left: auto;">语音转文字</span>
                </div>
            </div>

            <!-- TTS API -->
            <div class="card doc-section">
                <h3>🔊 文字转语音 (TTS)</h3>
                <div class="endpoint-box">
                    <span class="method-tag method-post">POST</span>
                    <span style="color: var(--text);">/v1/audio/speech</span>
                </div>

                <h4>请求参数</h4>
                <table class="param-table">
                    <thead>
                        <tr><th>参数</th><th>类型</th><th>必填</th><th>说明</th><th>示例</th></tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>text</td><td>string</td>
                            <td><span class="badge badge-required">必填</span></td>
                            <td>要转换的文字内容（≤3000字符）</td>
                            <td>"你好世界"</td>
                        </tr>
                        <tr>
                            <td>voice</td><td>string</td>
                            <td><span class="badge badge-optional">可选</span></td>
                            <td>语音角色，默认 zh-CN-YunyangNeural</td>
                            <td>"zh-CN-XiaoxiaoNeural"</td>
                        </tr>
                        <tr>
                            <td>speed</td><td>float</td>
                            <td><span class="badge badge-optional">可选</span></td>
                            <td>语速 0.5~2.0，默认 1.0</td>
                            <td>1.25</td>
                        </tr>
                        <tr>
                            <td>pitch</td><td>int</td>
                            <td><span class="badge badge-optional">可选</span></td>
                            <td>音调 -50~50 Hz，默认 0</td>
                            <td>10</td>
                        </tr>
                        <tr>
                            <td>style</td><td>string</td>
                            <td><span class="badge badge-optional">可选</span></td>
                            <td>语音风格，默认 general</td>
                            <td>"cheerful"</td>
                        </tr>
                    </tbody>
                </table>

                <h4>示例：curl (JSON)</h4>
                <pre><code>curl -X POST https://your-worker.workers.dev/v1/audio/speech \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "你好，欢迎使用 VoiceCraft！",
    "voice": "zh-CN-XiaoxiaoNeural",
    "speed": 1.0,
    "pitch": 0,
    "style": "cheerful"
  }' \\
  -o output.mp3</code></pre>

                <h4>示例：Python</h4>
                <pre><code>import requests

url = "https://your-worker.workers.dev/v1/audio/speech"
payload = {
    "text": "你好，欢迎使用 VoiceCraft！",
    "voice": "zh-CN-XiaoxiaoNeural",
    "speed": 1.0,
    "pitch": 0,
    "style": "cheerful"
}

response = requests.post(url, json=payload)
if response.status_code == 200:
    with open("output.mp3", "wb") as f:
        f.write(response.content)
    print("✅ 语音生成成功！")
else:
    print(f"❌ 错误: {response.json()}")</code></pre>

                <h4>示例：FormData</h4>
                <pre><code>curl -X POST https://your-worker.workers.dev/v1/audio/speech \\
  -F "text=你好世界" \\
  -F "voice=zh-CN-YunyangNeural" \\
  -F "speed=1.0" \\
  -o output.mp3</code></pre>

                <h4>可用语音列表</h4>
                <table class="param-table">
                    <thead><tr><th>语音 ID</th><th>名称</th><th>性别/特点</th></tr></thead>
                    <tbody>
                        <tr><td>zh-CN-XiaoxiaoNeural</td><td>晓晓</td><td>女 · 温柔</td></tr>
                        <tr><td>zh-CN-YunxiNeural</td><td>云希</td><td>男 · 年轻</td></tr>
                        <tr><td>zh-CN-YunyangNeural</td><td>云扬</td><td>男 · 新闻播报</td></tr>
                        <tr><td>zh-CN-XiaoyiNeural</td><td>晓伊</td><td>女 · 活泼</td></tr>
                        <tr><td>zh-CN-YunjianNeural</td><td>云健</td><td>男 · 运动</td></tr>
                        <tr><td>zh-CN-XiaochenNeural</td><td>晓辰</td><td>女 · 自然</td></tr>
                        <tr><td>zh-TW-HsiaoChenNeural</td><td>晓辰</td><td>女 · 台湾腔</td></tr>
                        <tr><td>zh-TW-HsiaoYuNeural</td><td>晓雨</td><td>女 · 台湾腔</td></tr>
                        <tr><td>zh-TW-YunJheNeural</td><td>云哲</td><td>男 · 台湾腔</td></tr>
                        <tr><td>zh-HK-HiuMaanNeural</td><td>晓曼</td><td>女 · 粤语</td></tr>
                    </tbody>
                </table>

                <h4>可用语音风格</h4>
                <p style="color: var(--text-secondary); font-size: 13px;">
                    <code>general</code>, <code>assistant</code>, <code>chat</code>, <code>customerservice</code>,
                    <code>newscast</code>, <code>affectionate</code>, <code>angry</code>, <code>calm</code>,
                    <code>cheerful</code>, <code>disgruntled</code>, <code>embarrassed</code>, <code>fearful</code>,
                    <code>gentle</code>, <code>sad</code>, <code>serious</code>
                </p>
            </div>

            <!-- STT API -->
            <div class="card doc-section">
                <h3>🎤 语音转文字 (STT)</h3>
                <div class="endpoint-box">
                    <span class="method-tag method-post">POST</span>
                    <span style="color: var(--text);">/v1/audio/transcriptions</span>
                </div>

                <h4>请求参数</h4>
                <table class="param-table">
                    <thead>
                        <tr><th>参数</th><th>类型</th><th>必填</th><th>说明</th><th>示例</th></tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>file</td><td>File</td>
                            <td><span class="badge badge-required">必填</span></td>
                            <td>音频文件（≤10MB）</td>
                            <td>audio.wav</td>
                        </tr>
                        <tr>
                            <td>language</td><td>string</td>
                            <td><span class="badge badge-optional">可选</span></td>
                            <td>语言代码，默认 zh</td>
                            <td>"zh"</td>
                        </tr>
                        <tr>
                            <td>api_key</td><td>string</td>
                            <td><span class="badge badge-optional">可选</span></td>
                            <td>SiliconFlow API Key</td>
                            <td>"sk-xxx"</td>
                        </tr>
                    </tbody>
                </table>

                <h4>示例：curl (FormData)</h4>
                <pre><code>curl -X POST https://your-worker.workers.dev/v1/audio/transcriptions \\
  -F "file=@audio.wav" \\
  -F "language=zh"</code></pre>

                <h4>示例：Python</h4>
                <pre><code>import requests

url = "https://your-worker.workers.dev/v1/audio/transcriptions"
with open("audio.wav", "rb") as f:
    files = {"file": ("audio.wav", f, "audio/wav")}
    data = {"language": "zh"}
    response = requests.post(url, files=files, data=data)

if response.status_code == 200:
    result = response.json()
    print(f"📝 识别结果: {result['text']}")
else:
    print(f"❌ 错误: {response.json()}")</code></pre>

                <h4>示例：JSON (Base64)</h4>
                <pre><code>import base64
import requests

url = "https://your-worker.workers.dev/v1/audio/transcriptions"
with open("audio.wav", "rb") as f:
    audio_base64 = base64.b64encode(f.read()).decode()

payload = {
    "file": audio_base64,
    "language": "zh"
}

response = requests.post(url, json=payload)
print(response.json())</code></pre>

                <h4>响应格式</h4>
                <pre><code>{
  "text": "识别出的文字内容",
  "language": "zh",
  "model": "FunAudioLLM/SenseVoiceSmall"
}</code></pre>

                <h4>支持的音频格式</h4>
                <p style="color: var(--text-secondary); font-size: 13px;">
                    WAV, MP3, FLAC, OGG, M4A, WEBM, AAC, OPUS, WMA
                </p>
            </div>

            <!-- 错误码 -->
            <div class="card doc-section">
                <h3>⚠️ 错误码说明</h3>
                <table class="param-table">
                    <thead><tr><th>状态码</th><th>说明</th></tr></thead>
                    <tbody>
                        <tr><td>200</td><td>请求成功</td></tr>
                        <tr><td>400</td><td>参数错误（缺少必填参数或参数格式不正确）</td></tr>
                        <tr><td>404</td><td>路径不存在</td></tr>
                        <tr><td>429</td><td>请求过于频繁，请稍后重试</td></tr>
                        <tr><td>500</td><td>服务器内部错误</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>Powered by Cloudflare Workers | Edge TTS + SiliconFlow SenseVoice</p>
            <p style="margin-top: 4px;">
                <a href="https://github.com" target="_blank">GitHub</a> · 
                多模型 API 转发服务
            </p>
        </div>
    </div>

    <!-- Toast -->
    <div class="toast" id="toast"></div>

    <script>
        // ========================================
        // 模式切换
        // ========================================
        var currentMode = 'tts';
        var currentAudioUrl = null;
        var selectedFile = null;

        function switchMode(mode) {
            currentMode = mode;
            var ttsPanel = document.getElementById('ttsPanel');
            var transcriptionPanel = document.getElementById('transcriptionPanel');
            var apiDocPanel = document.getElementById('apiDocPanel');
            var ttsBtn = document.getElementById('ttsModeBtn');
            var transcriptionBtn = document.getElementById('transcriptionModeBtn');
            var apiDocBtn = document.getElementById('apiDocModeBtn');

            // 隐藏所有面板
            ttsPanel.style.display = 'none';
            transcriptionPanel.style.display = 'none';
            apiDocPanel.style.display = 'none';

            // 移除所有 active
            ttsBtn.classList.remove('active');
            transcriptionBtn.classList.remove('active');
            apiDocBtn.classList.remove('active');

            // 激活目标
            if (mode === 'tts') {
                ttsPanel.style.display = 'block';
                ttsBtn.classList.add('active');
            } else if (mode === 'transcription') {
                transcriptionPanel.style.display = 'block';
                transcriptionBtn.classList.add('active');
            } else if (mode === 'apiDoc') {
                apiDocPanel.style.display = 'block';
                apiDocBtn.classList.add('active');
            }
        }

        // ========================================
        // Toast 提示
        // ========================================
        function showToast(message, type) {
            type = type || 'info';
            var toast = document.getElementById('toast');
            toast.textContent = message;
            toast.className = 'toast ' + type + ' show';
            clearTimeout(toast._timeout);
            toast._timeout = setTimeout(function() {
                toast.classList.remove('show');
            }, 3000);
        }

        // ========================================
        // TTS 字符计数
        // ========================================
        var ttsTextarea = document.getElementById('ttsText');
        var ttsCharCount = document.getElementById('ttsCharCount');
        ttsTextarea.addEventListener('input', function() {
            ttsCharCount.textContent = ttsTextarea.value.length;
        });

        // ========================================
        // 生成语音
        // ========================================
        async function generateSpeech() {
            var text = document.getElementById('ttsText').value.trim();
            if (!text) {
                showToast('请输入文字内容', 'error');
                return;
            }

            var btn = document.getElementById('ttsGenerateBtn');
            var originalHTML = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span> 生成中...';

            var voice = document.getElementById('ttsVoice').value;
            var speed = document.getElementById('ttsSpeed').value;
            var pitch = document.getElementById('ttsPitch').value;
            var style = document.getElementById('ttsStyle').value;

            try {
                var response = await fetch('/v1/audio/speech', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: text,
                        voice: voice,
                        speed: parseFloat(speed),
                        pitch: parseInt(pitch),
                        style: style
                    })
                });

                if (!response.ok) {
                    var errorData = await response.json().catch(function() { return {}; });
                    throw new Error(errorData.message || '生成失败 (' + response.status + ')');
                }

                var blob = await response.blob();
                if (currentAudioUrl) {
                    URL.revokeObjectURL(currentAudioUrl);
                }
                currentAudioUrl = URL.createObjectURL(blob);

                var audio = document.getElementById('ttsAudio');
                audio.src = currentAudioUrl;
                document.getElementById('ttsResult').classList.add('show');

                showToast('✅ 语音生成成功！', 'success');

            } catch (error) {
                console.error('TTS Error:', error);
                showToast('❌ ' + error.message, 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalHTML;
            }
        }

        // ========================================
        // 下载音频
        // ========================================
        function downloadAudio() {
            if (!currentAudioUrl) {
                showToast('请先生成语音', 'error');
                return;
            }
            var a = document.createElement('a');
            a.href = currentAudioUrl;
            a.download = 'voicecraft_' + Date.now() + '.mp3';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showToast('📥 下载已开始', 'success');
        }

        // ========================================
        // 文件上传处理
        // ========================================
        var uploadZone = document.getElementById('uploadZone');
        var audioFileInput = document.getElementById('audioFile');
        var fileInfo = document.getElementById('fileInfo');
        var sttBtn = document.getElementById('sttTranscribeBtn');

        function handleFileSelect(event) {
            var file = event.target.files[0];
            if (file) {
                processFile(file);
            }
        }

        function processFile(file) {
            var validTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/flac', 'audio/ogg', 'audio/x-m4a', 'audio/webm', 'audio/aac', 'audio/opus', 'audio/x-ms-wma'];
            var validExts = ['.wav', '.mp3', '.flac', '.ogg', '.m4a', '.webm', '.aac', '.opus', '.wma'];

            var ext = '.' + file.name.split('.').pop().toLowerCase();
            var isValidType = validTypes.includes(file.type);
            var isValidExt = validExts.includes(ext);

            if (!isValidType && !isValidExt && file.type !== '') {
                showToast('不支持的音频格式，请上传 WAV/MP3/FLAC/OGG/M4A/WEBM', 'error');
                return;
            }

            if (file.size > 10 * 1024 * 1024) {
                showToast('文件大小不能超过 10MB', 'error');
                return;
            }

            selectedFile = file;
            fileInfo.textContent = '✅ 已选择: ' + file.name + ' (' + formatSize(file.size) + ')';
            fileInfo.classList.add('show');
            sttBtn.disabled = false;
        }

        function formatSize(bytes) {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        }

        // 拖拽上传
        uploadZone.addEventListener('dragover', function(e) {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });
        uploadZone.addEventListener('dragleave', function() {
            uploadZone.classList.remove('drag-over');
        });
        uploadZone.addEventListener('drop', function(e) {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            var file = e.dataTransfer.files[0];
            if (file) {
                processFile(file);
            }
        });

        // ========================================
        // 语音转文字
        // ========================================
        async function transcribeAudio() {
            if (!selectedFile) {
                showToast('请先选择音频文件', 'error');
                return;
            }

            var originalHTML = sttBtn.innerHTML;
            sttBtn.disabled = true;
            sttBtn.innerHTML = '<span class="spinner"></span> 识别中...';

            var formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('language', 'zh');

            try {
                var response = await fetch('/v1/audio/transcriptions', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    var errorData = await response.json().catch(function() { return {}; });
                    throw new Error(errorData.message || '识别失败 (' + response.status + ')');
                }

                var result = await response.json();
                document.getElementById('sttText').textContent = result.text || '(未识别到内容)';
                document.getElementById('sttResult').classList.add('show');
                showToast('✅ 识别完成！', 'success');

            } catch (error) {
                console.error('STT Error:', error);
                showToast('❌ ' + error.message, 'error');
            } finally {
                sttBtn.disabled = false;
                sttBtn.innerHTML = originalHTML;
            }
        }

        // ========================================
        // 初始化
        // ========================================
        document.addEventListener('DOMContentLoaded', function() {
            switchMode('tts');
        });
    </script>
</body>
</html>`;
