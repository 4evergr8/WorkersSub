import yaml from "js-yaml";
import {clash, sha256, singbox, v2ray} from "./utils.js";
import {config} from "./config.js";

// ===== 主函数 =====
export default {
    async fetch(request, env) {
        const urlObj = new URL(request.url);
        let url = urlObj.href
        const firstEntry = urlObj.searchParams.entries().next().value;
        if (!firstEntry) return env.ASSETS.fetch(request)

        let [firstKey, firstValue] = firstEntry;


        // ===== 2. 请求订阅 =====
        let response;
        try {
            response = await fetch(firstValue, {
                headers: {"User-Agent": "ClashMeta/1.19.15"}
            });
        } catch (e) {
            return Response.redirect(firstValue, 302);
        }

        const upstreamHeaders = new Headers(response.headers);
        const rawText = await response.text();

        // ===== 3. 解析订阅 =====
        let proxies = [];
        let parseError = null;

        try {
            if (firstKey.includes('clash')) {
                proxies = clash(rawText);
            } else if (firstKey.includes('v2ray')) {
                proxies = v2ray(rawText);
            } else if (firstKey.includes('singbox')) {
                proxies = singbox(rawText);
            }
        } catch (e) {
            parseError = `解析失败（${firstKey} 解析器异常）：${e.message}`;
        }

        // 新增：如果没有提取到节点，尝试判断是否为有效 YAML（防止把纯 base64 或其他格式误判）
        if ((!proxies || proxies.length === 0) && !parseError) {
            // 如果解析器返回空，但内容看起来像 YAML，可能是格式问题或确实无节点
            if (rawText.trim().startsWith('proxies:') || rawText.includes('port:') || rawText.includes('- name:')) {
                parseError = "订阅解析成功，但未提取到任何节点（proxies 为空）";
            } else {
                parseError = "订阅内容无法被当前解析器识别（可能不是有效的 Clash / Sing-box / V2Ray 订阅）";
            }
        }

        // ===== 错误处理：无法解析或无节点时，返回错误 + 原始内容 =====
        if (parseError || !proxies || proxies.length === 0) {
            const errorMsg = parseError || "未知原因导致未提取到节点";

            const errorResponse = `
====================== 错误信息 ======================
${errorMsg}

请求地址, ${firstValue}
返回状态码, ${response.status} ${response.statusText}
内容长度, ${rawText.length} 字符
=====================================================

${rawText}
`.trim();

            return new Response(errorResponse, {
                status: 200,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'X-Error': 'Subscription Parse Failed'
                }
            });
        }


        const path = (await sha256(url)).slice(0, 8);

        const providerYaml = yaml.dump({
            "proxy-providers": {
                provider: {
                    type: "http",
                    url: url,
                    path: `./config/${path}.yaml`,
                    interval: 3600,
                    proxy: "DIRECT",
                    "size-limit": 0,
                    header: {
                        "User-Agent": ["mihomo/1.18.3"]
                    }
                }
            }
        }).replace(/"/g, '');


        // ===== 5. 将 proxies 转为 YAML 并追加 =====
        const proxiesYaml = yaml.dump({proxies: proxies}, {
            lineWidth: -1,
            noRefs: true,
            indent: 2
        }).replace(/"/g, '');

        let finalConfig = config.trimEnd();
        if (!finalConfig.endsWith('\n')) finalConfig += '\n';
        finalConfig += '\n' + providerYaml+'\n' +proxiesYaml;

        // ===== 6. 设置返回头 =====
        const headers = setHeaders(upstreamHeaders, firstValue);

        return new Response(finalConfig, {
            status: 200,
            headers
        });
    }
};

// setHeaders 函数保持不变（你原来的代码）
export function setHeaders(upstreamHeaders, link) {
    const cd = upstreamHeaders.get('Content-Disposition');
    let baseName = "";

    if (cd) {
        const m = cd.match(/filename\*?=([^;]+)/i);
        if (m) {
            let n = m[1].trim();
            n = n.toLowerCase().startsWith("utf-8''")
                ? decodeURIComponent(n.slice(7))
                : n.replace(/^["']|["']$/g, '');
            baseName = n.replace(/\.[^/.]+$/, "");
        }
    }

    if (!baseName) {
        try {
            const url = new URL(link);
            let domain = url.hostname.toLowerCase();
            const parts = domain.split('.');
            if (parts.length >= 3) {
                domain = parts[parts.length - 2];
            } else if (parts.length >= 2) {
                domain = parts[parts.length - 2];
            }

            const pathParts = url.pathname.split('/').filter(p => p.length > 0);
            let nameParts = [domain];
            if (pathParts.length >= 1) nameParts.push(pathParts[0]);
            if (pathParts.length >= 2) nameParts.push(pathParts[1]);

            baseName = nameParts.join('/');
        } catch (e) {
            baseName = "subscription";
        }
    }

    const hash = (() => {
        let h = 0, s = link;
        for (let i = 0; i < s.length; i++) {
            h = (h << 5) - h + s.charCodeAt(i);
            h |= 0;
        }
        return Math.abs(h).toString(36).slice(0, 6);
    })();

    const displayName = `✨${baseName}--${hash}`;

    const encode = s =>
        Array.from(new TextEncoder().encode(s))
            .map(b => '%' + b.toString(16).toUpperCase().padStart(2, '0'))
            .join('');

    const headers = new Headers(upstreamHeaders);
    headers.set('Content-Disposition', `inline; filename*=UTF-8''${encode(displayName)}`);
    headers.set('Content-Type', 'text/yaml; charset=utf-8');

    return headers;
}