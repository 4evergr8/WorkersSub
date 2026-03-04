import yaml from 'js-yaml';

export default {
    async fetch(request, env) {
        // ========== 1. 读取 Assets 中的 config.yaml ==========
        let baseConfig = {};
        try {
            const assetUrl = new URL("config.yaml", request.url);
            const assetRes = await env.ASSETS.fetch(assetUrl);

            if (!assetRes.ok) throw new Error(`配置文件读取失败：${assetRes.status}`);
            const baseConfigStr = await assetRes.text();
            baseConfig = yaml.load(baseConfigStr);
        } catch (e) {
            return new Response(`基础配置加载失败：${e.message}`, { status: 500 });
        }

        // ========== 2. 校验并获取订阅链接 ==========
        const urlObj = new URL(request.url);
        if (!urlObj.searchParams.has('links')) {
            return new Response('缺少 links 参数', { status: 400 });
        }
        const link = urlObj.searchParams.get('links');

        // ========== 3. 拉取订阅 ==========
        let response;
        try {
            response = await fetch(link, {
                headers: {
                    'User-Agent': 'ClashMeta/1.19.15; mihomo/1.19.15; clash-verge/v1.6.6'
                }
            });
        } catch {
            return Response.redirect(link, 302);
        }
// ========== 4. 文件名 ==========
        const upstreamHeaders = new Headers(response.headers);
        const cd = upstreamHeaders.get('Content-Disposition');

        let fileName;
        if (cd) {
            const m = cd.match(/filename\*?=([^;]+)/i);
            if (m) {
                let n = m[1].trim();
                n = n.toLowerCase().startsWith("utf-8''")
                    ? decodeURIComponent(n.slice(7))
                    : n.replace(/^["']|["']$/g, '');
                fileName = `🌀${n}`;
            }
        }
        if (!fileName) {
            const host = new URL(link).hostname.split('.').slice(-2).join('.');
            fileName = `🌀${host}`;
        }

// ===== 追加最后一个参数或路径（与你原示例一致）=====
        const linkObj = new URL(link);
        const sp = [...linkObj.searchParams.values()];

        let lastParam;
        if (sp.length > 0) {
            lastParam = sp[sp.length - 1];
        } else {
            const pathname = linkObj.pathname;
            const pathParts = pathname.split('/').filter(Boolean);
            lastParam = pathParts.length ? pathParts[pathParts.length - 1] : "无";
        }

        fileName = `${fileName}--${lastParam}`;

        const encodeRFC5987 = s =>
            Array.from(new TextEncoder().encode(s))
                .map(b => '%' + b.toString(16).toUpperCase().padStart(2, '0'))
                .join('');

        const newCD = `inline; filename*=UTF-8''${encodeRFC5987(fileName)}`;

        // ========== 5. 解析订阅 ==========
        let subParsed;
        try {
            subParsed = yaml.load(await response.text());
        } catch {
            return Response.redirect(link, 302);
        }

        const hasProxies = Array.isArray(subParsed?.proxies) && subParsed.proxies.length > 0;

        if (!hasProxies) {
            return Response.redirect(link, 302);
        }


        subParsed.proxies.forEach(proxy => {
            proxy.udp = true;
        });

        const proxyNames = hasProxies ? subParsed.proxies.map(p => p.name || '') : [];

        // ========== 6. 动态 proxy-groups ==========
        baseConfig['proxy-groups']?.forEach(group => {
            // 只处理同时有 filter 或 exclude-filter 的组
            const hasFilter = 'filter' in group && group.filter;
            const hasExclude = 'exclude-filter' in group && group['exclude-filter'];

            if (!hasFilter && !hasExclude) {
                return;  // 没有过滤规则，不动原 proxies
            }

            const regex = new RegExp(
                hasFilter ? group.filter : group['exclude-filter'],
                'i'
            );

            let selectedNames;
            if (hasFilter) {
                // 白名单：只保留匹配的 + 自动选择
                selectedNames = proxyNames.filter(name => regex.test(name));
                if (selectedNames.length > 0) {
                    group.proxies = [...selectedNames, '⚡自动选择⚡'];
                } else {
                    // 没匹配到任何节点时，至少保留自动选择（可选，根据需求可改成保持原样）
                    group.proxies = ['⚡自动选择⚡'];
                }
            } else {
                // 黑名单：保留不匹配的，不加自动选择
                selectedNames = proxyNames.filter(name => !regex.test(name));
                group.proxies = selectedNames;
                // 如果全被排除光了，就留空（或按需处理，例如保留原 proxies）
                // 这里直接赋值为过滤后的结果，即使是 []
            }
        });

        // ========== 7. 合并 ==========
        if (hasProxies) baseConfig.proxies = subParsed.proxies;


        // ========== 8. 返回 ==========
        const out = yaml.dump(baseConfig).replace(/"/g, '');
        const headers = new Headers(upstreamHeaders);
        headers.set('Content-Disposition', newCD);
        headers.set('Content-Type', 'text/yaml; charset=utf-8');

        return new Response(out, { status: 200, headers });
    }
};
