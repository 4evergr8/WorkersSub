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
        } catch (e) {
            // fetch 本身出错（网络、超时、DNS 等），仍重定向
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
        let rawText = '';
        try {
            rawText = await response.text();
            subParsed = yaml.load(rawText);
        } catch (e) {
            // YAML 解析失败（即使上游是 4xx/5xx 状态码，也尝试解析 body）
            return new Response(
                `订阅解析失败（YAML 格式错误）：${e.message}\n\nHTTP 状态码: ${response.status}\n原始内容（前 2000 字符）：\n${rawText.slice(0, 2000)}`,
                {
                    status: 234,
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                }
            );
        }

        const hasProxies = Array.isArray(subParsed?.proxies) && subParsed.proxies.length > 0;

        if (!hasProxies) {
            // 无 proxies 或为空
            return new Response(
                `订阅有效但无可用代理节点（proxies 为空或不存在）\n\nHTTP 状态码: ${response.status}\n原始内容（前 2000 字符）：\n${rawText.slice(0, 2000)}`,
                {
                    status: 404,
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                }
            );
        }

        // ========== 6. 正常处理节点 ==========
        subParsed.proxies.forEach(proxy => {
            proxy.udp = true;
        });

        const proxyNames = subParsed.proxies.map(p => p.name || '');

        // ========== 7. 动态 proxy-groups ==========
        baseConfig['proxy-groups']?.forEach(group => {
            const hasFilter = 'filter' in group && group.filter;
            const hasExclude = 'exclude-filter' in group && group['exclude-filter'];

            if (!hasFilter && !hasExclude) {
                return;
            }

            const regex = new RegExp(
                hasFilter ? group.filter : group['exclude-filter'],
                'i'
            );

            let selectedNames;
            if (hasFilter) {
                selectedNames = proxyNames.filter(name => regex.test(name));
            } else {
                selectedNames = proxyNames.filter(name => !regex.test(name));
            }

            if (selectedNames.length === 0) {
                group.proxies = ['⚡自动选择⚡'];
            } else {
                group.proxies = hasFilter
                    ? [...selectedNames, '⚡自动选择⚡']
                    : selectedNames;
            }
        });

        // ========== 8. 合并 ==========
        baseConfig.proxies = subParsed.proxies;

        // ========== 9. 返回 ==========
        const out = yaml.dump(baseConfig).replace(/"/g, '');
        const headers = new Headers(upstreamHeaders);
        headers.set('Content-Disposition', newCD);
        headers.set('Content-Type', 'text/yaml; charset=utf-8');

        return new Response(out, { status: 200, headers });
    }
};