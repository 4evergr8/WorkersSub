import yaml from "js-yaml";
// ===== clash 解析 =====
export function clash(rawText) {
    try {
        const parsed = yaml.load(rawText);
        const proxies = parsed?.proxies;

        if (Array.isArray(proxies)) {
            for (const p of proxies) p.udp = true;
            return proxies;
        }
    } catch {}

    // 兜底：逐行解析 flow style
    const proxies = [];
    const lines = rawText.split(/\r?\n/);

    for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("- {")) continue;

        try {
            const obj = yaml.load("proxies:\n" + t);
            if (obj?.proxies?.[0]) {
                obj.proxies[0].udp = true;
                proxies.push(obj.proxies[0]);
            }
        } catch {}
    }

    return proxies;
}
// ===== v2ray 解析 =====
export function v2ray(rawText) {
    if (!rawText || typeof rawText !== 'string') return null;
    try {
        rawText=atob(rawText);
    } catch {

    }
    const proxies = [];

    rawText.split(/\r?\n/).forEach(line => {
        line = line.trim();
        if (!line) return;

        try {

            // ===== VLESS =====
            if (line.startsWith('vless://')) {

                const url = new URL(line);
                const query = Object.fromEntries(url.searchParams.entries());
                let network = query.type || 'tcp';

                const node = {
                    name: decodeURIComponent(url.hash.slice(1)) || '',
                    type: 'vless',
                    server: url.hostname,
                    port: parseInt(url.port),
                    uuid: url.username,
                    tls: query.security === 'tls' || query.security === 'reality',
                    servername: query.sni || undefined,
                    flow: query.flow || undefined,
                    "client-fingerprint": query.fp || undefined,
                    "skip-cert-verify": query.allowInsecure === '1' ? true : undefined,
                    network: network
                };

                if (query.security === 'reality') {
                    node.network = 'tcp';
                    node['reality-opts'] = {};
                    if (query.pbk) node['reality-opts']['public-key'] = query.pbk;
                    if (query.sid) node['reality-opts']['short-id'] = query.sid;
                }

                if (network === 'ws') {
                    node['ws-opts'] = {
                        path: query.path || '',
                        headers: { Host: query.host || '' }
                    };
                }

                proxies.push(node);
            }

            // ===== SS =====
            else if (line.startsWith('ss://')) {

                const url = new URL(line);
                const decoded = atob(url.username);
                const [cipher, password] = decoded.split(':');

                proxies.push({
                    name: decodeURIComponent(url.hash.slice(1)) || '',
                    type: 'ss',
                    server: url.hostname,
                    port: parseInt(url.port),
                    cipher: cipher,
                    password: password
                });
            }

            // ===== TROJAN =====
            else if (line.startsWith('trojan://')) {

                const url = new URL(line);
                const query = Object.fromEntries(url.searchParams.entries());

                const node = {
                    name: decodeURIComponent(url.hash.slice(1)) || '',
                    type: 'trojan',
                    server: url.hostname,
                    port: parseInt(url.port),
                    password: url.username,
                    sni: query.sni || undefined,
                    tls: true,
                    "skip-cert-verify": query.allow_insecure === '1'
                };

                if (query.alpn) node.alpn = [query.alpn];

                if (query.type === 'ws') {
                    node['ws-opts'] = {
                        path: query.path || '',
                        headers: { Host: query.host || url.hostname }
                    };
                }

                proxies.push(node);
            }

            // ===== VMESS =====
            else if (line.startsWith('vmess://')) {

                const json = JSON.parse(
                    atob(line.slice(8).trim())
                );

                const network = json.net || 'tcp';

                const node = {
                    name: json.ps || '',
                    type: 'vmess',
                    server: json.add,
                    port: parseInt(json.port),
                    uuid: json.id,
                    alterId: parseInt(json.aid) || 0,
                    cipher: json.scy || 'auto',
                    tls: json.tls === 'tls',
                    "skip-cert-verify": false
                };

                if (json.sni) node.servername = json.sni;

                if (network === 'ws') {
                    node.network = 'ws';
                    node['ws-opts'] = {
                        path: json.path || '/',
                        headers: {
                            Host: json.host || json.add
                        }
                    };
                }

                proxies.push(node);
            }

        } catch (e) {}

    });

    return proxies.length ? proxies : null;
}
// ===== singbox 解析 =====
export function singbox(rawText) {

    const proxies = [];
    if (!rawText || typeof rawText !== 'string') return proxies;

    let obj;

    try {
        obj = JSON.parse(rawText);
    } catch {
        return proxies;
    }

    if (!obj || !Array.isArray(obj.outbounds)) return proxies;

    obj.outbounds.forEach(o => {

        try {

            // ===== VLESS =====
            if (o.type === 'vless') {

                const node = {
                    name: o.tag || '',
                    type: 'vless',
                    server: o.server,
                    port: o.server_port,
                    uuid: o.uuid,
                    tls: o.tls?.enabled === true,
                    servername: o.tls?.server_name || undefined,
                    "client-fingerprint": o.tls?.utls?.fingerprint || undefined
                };

                if (o.tls?.reality?.enabled) {
                    node.network = 'tcp';
                    node['reality-opts'] = {};

                    if (o.tls.reality.public_key)
                        node['reality-opts']['public-key'] = o.tls.reality.public_key;

                    if (o.tls.reality.short_id)
                        node['reality-opts']['short-id'] = o.tls.reality.short_id;
                }

                proxies.push(node);
            }

            // ===== VMESS =====
            else if (o.type === 'vmess') {

                const node = {
                    name: o.tag || '',
                    type: 'vmess',
                    server: o.server,
                    port: o.server_port,
                    uuid: o.uuid,
                    alterId: o.alter_id || 0,
                    cipher: o.security || 'auto',
                    tls: o.tls?.enabled === true,
                    "skip-cert-verify": false
                };

                proxies.push(node);
            }

            // ===== TROJAN =====
            else if (o.type === 'trojan') {

                const node = {
                    name: o.tag || '',
                    type: 'trojan',
                    server: o.server,
                    port: o.server_port,
                    password: o.password,
                    sni: o.tls?.server_name || undefined,
                    alpn: o.tls?.alpn || undefined,
                    tls: o.tls?.enabled === true,
                    "skip-cert-verify": o.tls?.insecure === true
                };

                if (o.transport?.type === 'ws') {
                    node['ws-opts'] = {
                        path: o.transport.path || '/',
                        headers: {
                            Host: o.transport.headers?.Host || o.tls?.server_name || o.server
                        }
                    };
                }

                proxies.push(node);
            }

            // ===== SHADOWSOCKS =====
            else if (o.type === 'shadowsocks') {

                const node = {
                    name: o.tag || '',
                    type: 'ss',
                    server: o.server,
                    port: o.server_port,
                    cipher: o.method,
                    password: o.password
                };

                proxies.push(node);
            }

        } catch {}

    });

    return proxies;
}