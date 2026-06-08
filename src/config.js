export const config = `
mode: rule
external-controller: 127.0.0.1:9090
external-ui: ./metacubexd
allow-lan: false
log-level: warning
ipv6: true
keep-alive-idle: 15
keep-alive-interval: 10
disable-keep-alive: false
unified-delay: false
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

  - GEOIP,telegram,📥下载内容📥,no-resolve
  - GEOSITE,telegram,📥下载内容📥
  - GEOSITE,category-cdn-!cn,📥下载内容📥
  - GEOSITE,huggingface,📥下载内容📥
  - GEOSITE,category-netdisk-!cn,📥下载内容📥
  - GEOSITE,python,📥下载内容📥
  - GEOSITE,github,📥下载内容📥

  - GEOSITE,CATEGORY-AI-!CN,🧠人工智能🧠

  - GEOSITE,category-cryptocurrency,🪙加密货币🪙

  - GEOSITE,youtube,🌍国外媒体🌍

  - MATCH,📌节点选择📌


proxy-groups:
  - name: 📌节点选择📌
    type: select
    url: https://www.google.com/generate_204
    interval: 600
    timeout: 3000
    max-failed-times: 3
    include-all: true
    proxies:
      - ⚡自动选择⚡
      - ⚖️负载均衡⚖️
      - 🇯🇵日韩节点🇯🇵
      - 🇭🇰港台节点🇭🇰

  - name: 📥下载内容📥
    type: select
    url: https://www.google.com/generate_204
    interval: 600
    timeout: 3000
    max-failed-times: 3
    include-all: true
    proxies:
      - ⚖️负载均衡⚖️
      - ⚡自动选择⚡
      - 🇯🇵日韩节点🇯🇵
      - 🇭🇰港台节点🇭🇰

  - name: 🧠人工智能🧠
    type: url-test
    url: https://api.openai.com/v1/models
    expected-status: 401
    interval: 600
    timeout: 3000
    max-failed-times: 3
    tolerance: 100
    exclude-filter: 订阅|到期|官网|剩余|RU|俄罗斯|🇷🇺 #|HK|香港|🇭🇰|US|美国|🇺🇸
    include-all: true
    proxies: []

  - name: 🌍国外媒体🌍
    type: load-balance
    strategy: consistent-hashing
    url: https://music.youtube.com
    interval: 600
    timeout: 3000
    max-failed-times: 3
    tolerance: 100
    exclude-filter: 订阅|到期|官网|剩余|RU|俄罗斯|🇷🇺|KR|韩国|🇰🇷  #|VN|越南|🇻🇳|MY|马来西亚|🇲🇾|🇷🇺
    include-all: true
    proxies: []

  - name: 🪙加密货币🪙
    type: url-test
    url: https://api.binance.com/api/v3/ping
    expected-status: 200
    interval: 600
    timeout: 3000
    max-failed-times: 3
    tolerance: 100
    exclude-filter: 订阅|到期|官网|剩余|RU|俄罗斯|🇷🇺|CA|加拿大|🇨🇦|US|美国|🇺🇸
    include-all: true
    proxies: []

  - name: 🇯🇵日韩节点🇯🇵
    type: url-test
    url: https://www.dlsite.com
    interval: 600
    timeout: 3000
    max-failed-times: 3
    tolerance: 100
    filter: JP|日本|🇯🇵|KR|韩国|🇰🇷
    include-all: true
    proxies: [ ]

  - name: 🇭🇰港台节点🇭🇰
    type: url-test
    url: https://www.google.com/generate_204
    interval: 600
    timeout: 3000
    max-failed-times: 3
    tolerance: 100
    filter: HK|香港|🇭🇰|TW|台湾|🇹🇼
    include-all: true
    proxies: [ ]

  - name: ⚡自动选择⚡
    type: url-test
    url: https://www.google.com/generate_204
    interval: 600
    timeout: 3000
    max-failed-times: 3
    tolerance: 100
    exclude-filter: 订阅|到期|官网|剩余|RU|俄罗斯|🇷🇺|KR|韩国|🇰🇷
    include-all: true
    proxies: []

  - name: ⚖️负载均衡⚖️
    type: load-balance
    strategy: round-robin
    url: https://www.google.com/generate_204
    timeout: 3000
    max-failed-times: 3
    interval: 600
    tolerance: 100
    exclude-filter: 订阅|到期|官网|剩余|RU|俄罗斯|🇷🇺|KR|韩国|🇰🇷
    include-all: true
    proxies: [ ]




`;