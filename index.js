import yaml from "js-yaml";
import {clash, singbox, v2ray} from "./utils.js";


// ===== 主函数 =====
export default {
    async fetch(request, env) {
        const urlObj = new URL(request.url);
        const firstEntry = urlObj.searchParams.entries().next().value;
        if (!firstEntry) return new Response("缺少参数", { status: 400 });
        let [firstKey, firstValue] = firstEntry;
        const now = new Date();
        const yyyy = now.getFullYear().toString();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');

        if (firstKey.includes('date')) {
            firstValue = firstValue
                .replace(/yyyy/g, yyyy)
                .replace(/mm/g, mm)
                .replace(/dd/g, dd);
        }

        // ===== 2. 请求订阅 =====
        let response;
        try {
            response = await fetch(firstValue, { headers: { "User-Agent": "ClashMeta/1.19.15" } });
        } catch {
            return Response.redirect(firstValue, 302);
        }

        const upstreamHeaders = new Headers(response.headers);
        const rawText = await response.text();
        // ===== 3. 解析订阅 =====
        let proxies;
        if (firstKey.includes('clash')) proxies = clash(rawText);
        else if (firstKey.includes('v2ray')) proxies = v2ray(rawText);
        else if (firstKey.includes('singbox')) proxies = singbox(rawText);

        if (!proxies || proxies.length === 0) {
            return new Response("无节点", { status: 200 });
        }


        // ===== 4. 获取 config.yaml =====
        let baseConfig = {};
        try {
            const assetUrl = new URL("config.yaml", request.url);
            const assetRes = await env.ASSETS.fetch(assetUrl);
            if (!assetRes.ok) return new Response("基础配置读取失败", { status: 500 });
            baseConfig = yaml.load(await assetRes.text());
        } catch (e) {
            return new Response(`基础配置加载失败：${e.message}`, { status: 500 });
        }

        // ===== 5. 构建最终配置 =====
        const out = buildConfig(baseConfig, proxies);

        // ===== 6. 设置返回头 =====
        const headers = setHeaders(upstreamHeaders, firstValue);
        return new Response(out, { status: 200, headers });
    }
};



// ===== 构建最终配置 =====
export function buildConfig(baseConfig, proxies) {
    const proxyNames = proxies.map(p => p.name || '');
    baseConfig['proxy-groups']?.forEach(group => {
        const hasFilter = 'filter' in group && group.filter;
        const hasExclude = 'exclude-filter' in group && group['exclude-filter'];
        if (!hasFilter && !hasExclude) return;
        const regex = new RegExp(hasFilter ? group.filter : group['exclude-filter'], 'i');
        const selectedNames = hasFilter
            ? proxyNames.filter(n => regex.test(n))
            : proxyNames.filter(n => !regex.test(n));
        group.proxies = selectedNames.length ? (hasFilter ? [...selectedNames, '⚡自动选择⚡'] : selectedNames) : ['⚡自动选择⚡'];
    });
    baseConfig.proxies = proxies;
    return yaml.dump(baseConfig).replace(/"/g, '');
}

// ===== 设置返回头 =====
export function setHeaders(upstreamHeaders, link) {
    const cd = upstreamHeaders.get('Content-Disposition');
    let baseName;

    // 1. 尝试从 Content-Disposition 获取原始文件名
    if (cd) {
        const m = cd.match(/filename\*?=([^;]+)/i);
        if (m) {
            let n = m[1].trim();
            n = n.toLowerCase().startsWith("utf-8''")
                ? decodeURIComponent(n.slice(7))
                : n.replace(/^["']|["']$/g, '');
            baseName = n;
        }
    }

    // 2. 如果没有文件名，用根域名作为基础
    if (!baseName) {
        baseName = new URL(link).hostname.split('.').slice(-2).join('.');
    }

    // 3. 对 URL 生成短哈希，确保不同 URL 不重复
    const hash = (() => {
        let h = 0, s = link;
        for (let i = 0; i < s.length; i++) {
            h = (h << 5) - h + s.charCodeAt(i);
            h |= 0;
        }
        return Math.abs(h).toString(36).slice(0, 6);
    })();

    // 4. 拼接 emoji + 基础名 + 哈希
    const fileName = `✨${baseName}--${hash}`;

    // 5. URL encode
    const encode = s =>
        Array.from(new TextEncoder().encode(s))
            .map(b => '%' + b.toString(16).toUpperCase().padStart(2, '0'))
            .join('');

    const headers = new Headers(upstreamHeaders);
    headers.set('Content-Disposition', `inline; filename*=UTF-8''${encode(fileName)}`);
    headers.set('Content-Type', 'text/yaml; charset=utf-8');

    return headers;
}
