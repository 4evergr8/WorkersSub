import yaml from "js-yaml";
import {clash, singbox, v2ray} from "./utils.js";


// ===== 主函数 =====
export default {
    async fetch(request, env) {
        const urlObj = new URL(request.url);
        let url = urlObj.href
        const firstEntry = urlObj.searchParams.entries().next().value;
        if (!firstEntry) return env.ASSETS.fetch(request)

        let [firstKey, firstValue] = firstEntry;

        let response;
        try {
            response = await fetch(firstValue, {
                headers: {"User-Agent": "clash.meta"},
            });
        } catch (e) {
            return Response.redirect(firstValue, 302);
        }
        const upstreamHeaders = new Headers(response.headers);
        const rawText = await response.text();
        let proxies = [];
        let Error = null;

        try {
            if (firstKey.includes('clash')) {
                proxies = clash(rawText);
            } else if (firstKey.includes('v2ray')) {
                proxies = v2ray(rawText);
            } else if (firstKey.includes('singbox')) {
                proxies = singbox(rawText);
            }
        } catch (e) {
            Error = `解析器异常: ${e.message}`;
        }

        if (!proxies || proxies.length === 0) {
            Error = Error || "订阅解析失败或订阅内不存在代理节点";
        }

        if (Error) {
            const errorText = Error + "\n" + rawText;

            return new Response(errorText, {
                status: 200,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'X-Error': 'Subscription Parse Failed'
                }
            });
        }

        // ===== 5. 将 proxies 转为 YAML 并追加 =====
        const proxiesYaml = yaml.dump({proxies: proxies}, {
            lineWidth: -1,
            noRefs: true,
            indent: 2
        }).replace(/"/g, '');


        const cfgResp = await env.ASSETS.fetch(new URL("./config.yaml", request.url));
        const config = await cfgResp.text();
        let finalConfig = config.trimEnd();
        if (!finalConfig.endsWith('\n')) finalConfig += '\n';

        finalConfig += '\n' + proxiesYaml;

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