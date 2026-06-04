# WorkersSub 🚀
基于 **Cloudflare Workers** 的 Clash订阅覆写和转换  
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare%20Workers-%23F38020?style=flat&logo=cloudflare&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

## 🔥 功能亮点
- 🔄 实时覆写上游订阅
- ✏️ 自动修改返回头来命名节点,解决强迫症  
- ⚡ 用YAML自定义代理组配置
- ♻️ 支持sing-box,v2ray转clashmeta(demo)
## 🚀 极速部署
<a href="https://deploy.workers.cloudflare.com/?url=https://github.com/4evergr8/WorkersSub">
    <img src="https://deploy.workers.cloudflare.com/button" alt="Deploy to Cloudflare Workers" style="height: 32px;"/>
</a>  

部署完你会得到类似这样的地址：
```
https://your-worker-name.your-account.workers.dev
```
## 🎯 食用方法

订阅转换格式：

```
https://你的workers域名/?clash=https://上游机场Clash订阅链接
https://你的workers域名/?v2ray=https://上游机场v2ray订阅链接
https://你的workers域名/?singbox=https://上游机场singbox订阅链接
```
最后将组合后的链接直接丢进 Clash系随便哪个客户端都行！😎
## ⚙️ 自用覆写规则示例

```YAML
mode: rule
external-controller: 127.0.0.1:9090
external-ui: ./metacubexd
allow-lan: false
log-level: warning
ipv6: true
keep-alive-idle: 15
keep-alive-interval: 10
disable-keep-alive: false
unified-delay: true
tcp-concurrent: true
geodata-loader: memconservative
find-process-mode: off
geo-auto-update: true
geo-update-interval: 24
etag-support: true
geodata-mode: true
geox-url:
  geoip: "https://github.com/Loyalsoldier/v2ray-rules-dat/releases/latest/download/geoip.dat"
  geosite: "https://github.com/Loyalsoldier/v2ray-rules-dat/releases/latest/download/geosite.dat"
profile:
  store-selected: false
  store-fake-ip: true

tun:
  enable: true
  stack: "gvisor"
  device: "tun0"
  auto-route: true
  auto-detect-interface: true
  strict-route: true



dns:
  enable: true
  cache-algorithm: lru
  prefer-h3: false
  listen: 0.0.0.0:1053
  ipv6: true
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  fake-ip-filter-mode: blacklist
  fake-ip-filter:
    - geosite:cn
    - geosite:private
  use-hosts: false
  use-system-hosts: true
  default-nameserver:
    - tls://1.12.12.12:853
    - tls://223.5.5.5:853
  nameserver:
    - https://dns.alidns.com/dns-query#h3=true
    - https://doh.pub/dns-query

rules:
  - GEOSITE,category-ads-all,REJECT
  - IP-CIDR,0.0.0.0/32,REJECT,no-resolve

  - GEOSITE,cn,DIRECT
  - GEOSITE,googlefcm,DIRECT
  - GEOSITE,private,DIRECT
  - GEOIP,cn,DIRECT,no-resolve
  - GEOIP,private,DIRECT,no-resolve

  - GEOSITE,CATEGORY-AI-!CN,🧠人工智能🧠

  - GEOSITE,category-cryptocurrency,🪙加密货币🪙

  - GEOSITE,youtube,🌍国外媒体🌍

  - MATCH,📌节点选择📌


proxy-groups:
  - name: 📌节点选择📌
    type: select
    url: https://www.google.com
    expected-status: 200
    interval: 600
    lazy: false
    timeout: 1000
    max-failed-times: 3
    include-all: true
    proxies:
      - ⚡自动选择⚡
      - ⚖️负载均衡⚖️
      - 🇯🇵日本节点🇯🇵
      - 🇭🇰香港节点🇭🇰
      - 🇺🇸美国节点🇺🇸

  - name: 🧠人工智能🧠
    type: url-test
    url: https://api.openai.com/v1/models
    expected-status: 401
    interval: 300
    timeout: 1000
    max-failed-times: 3
    tolerance: 200
    exclude-filter: 订阅|到期|官网|剩余|RU|俄罗斯|🇷🇺 #|HK|香港|🇭🇰|US|美国|🇺🇸
    include-all: true
    proxies: []

  - name: 🌍国外媒体🌍
    type: load-balance
    strategy: consistent-hashing
    url: https://music.youtube.com
    expected-status: 200
    interval: 300
    timeout: 1000
    max-failed-times: 3
    tolerance: 200
    exclude-filter: 订阅|到期|官网|剩余|RU|俄罗斯|🇷🇺|KR|韩国|🇰🇷  #|VN|越南|🇻🇳|MY|马来西亚|🇲🇾|🇷🇺
    include-all: true
    proxies: []

  - name: 🪙加密货币🪙
    type: url-test
    url: https://api.binance.com/api/v3/ping
    expected-status: 200
    interval: 300
    timeout: 1000
    max-failed-times: 3
    tolerance: 200
    exclude-filter: 订阅|到期|官网|剩余|RU|俄罗斯|🇷🇺|CA|加拿大|🇨🇦|US|美国|🇺🇸
    include-all: true
    proxies: []

  - name: ⚡自动选择⚡
    type: url-test
    url: https://www.google.com
    expected-status: 200
    interval: 300
    timeout: 1000
    max-failed-times: 3
    tolerance: 200
    exclude-filter: 订阅|到期|官网|剩余|RU|俄罗斯|🇷🇺|KR|韩国|🇰🇷
    include-all: true
    proxies: []

  - name: 🇯🇵日本节点🇯🇵
    type: url-test
    url: https://www.dlsite.com
    expected-status: 200
    interval: 300
    timeout: 1000
    max-failed-times: 3
    tolerance: 200
    filter: JP|日本|🇯🇵
    include-all: true
    proxies: [ ]

  - name: 🇭🇰香港节点🇭🇰
    type: url-test
    url: https://www.google.com
    expected-status: 200
    interval: 300
    timeout: 1000
    max-failed-times: 3
    tolerance: 200
    filter: HK|香港|🇭🇰
    include-all: true
    proxies: [ ]

  - name: 🇺🇸美国节点🇺🇸
    type: url-test
    url: https://www.google.com
    expected-status: 200
    interval: 300
    timeout: 1000
    max-failed-times: 3
    tolerance: 200
    filter: US|美国|🇺🇸
    include-all: true
    proxies: [ ]

  - name: ⚖️负载均衡⚖️
    type: load-balance
    strategy: round-robin
    url: https://www.google.com
    expected-status: 200
    timeout: 1000
    max-failed-times: 3
    interval: 300
    tolerance: 200
    exclude-filter: 订阅|到期|官网|剩余|RU|俄罗斯|🇷🇺|KR|韩国|🇰🇷
    include-all: true
    proxies: [ ]
```

