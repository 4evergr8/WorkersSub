# WorkersSub 🚀
基于 **Cloudflare Workers** 的 Clash订阅覆写和转换  
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare%20Workers-%23F38020?style=flat&logo=cloudflare&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

## 🔥 功能亮点
- 🔄 实时覆写上游订阅
- 👌 支持自动填充订阅链接内的时间
- ✏️ 自动修改返回头来命名节点,解决强迫症  
- ⚡ 用YAML自定义代理组配置,支持双向正则筛选节点
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
https://你的workers域名?clash=https://上游机场Clash订阅链接
https://你的workers域名?v2ray=https://上游机场v2ray订阅链接
https://你的workers域名?singbox=https://上游机场singbox订阅链接

```
如需替换日期仅需在参数后面加date,用yyyymmdd替换原链接内的日期,程序将自动填充当天日期,例:
```
https://你的workers域名?clashdate=https://xxx.com/yyyy/mm/yyyymmdd
```
最后将组合后的链接直接丢进 Clash系随便哪个客户端都行！😎
## ⚙️ 覆写规则示例,注意代理组内的exclude-filter和filter两项无法过滤手动写入的节点,仅作为程序过滤的依据

```YAML
port: 7890
socks-port: 7891
mode: rule
allow-lan: false
log-level: silent
ipv6: true
disable-keep-alive: true
unified-delay: true
tcp-concurrent: true
geodata-loader: memconservative
dns:
  enable: true
  cache-algorithm: lru
  prefer-h3: true
  listen: 0.0.0.0:1053
  ipv6: true
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  fake-ip-filter-mode: blacklist
  fake-ip-filter:
    - geosite:private
    - '*.lan'
    - '*.local'
  use-hosts: false
  use-system-hosts: true
  respect-rules: true
  default-nameserver:
    - tls://1.12.12.12:853
    - tls://223.5.5.5:853
  nameserver-policy:
    geosite:private,cn,geolocation-cn: system
  proxy-server-nameserver:
    - https://dns.alidns.com/dns-query
    - https://dns.pub/dns-query
  direct-nameserver:
    - system
  direct-nameserver-follow-policy: false
  nameserver:
    - https://dns.cloudflare.com/dns-query
    - https://dns.google/dns-query


sniffer:
  enable: false


rules:
  - IP-CIDR,0.0.0.0/32,REJECT
  - DOMAIN-REGEX,^ad\..*,REJECT
  - DOMAIN-REGEX,.*\.ad\..*,REJECT
  - GEOSITE,category-ads-all,REJECT


  - DOMAIN-KEYWORD,teracloud,⚡自动选择⚡


  - GEOSITE,geolocation-cn,DIRECT
  - GEOSITE,private,DIRECT


  - GEOSITE,CATEGORY-AI-!CN,🧠人工智能🧠


  - GEOSITE,DLSITE,🇯🇵日本网站🇯🇵
  - DOMAIN,rss.4evergr8.workers.dev,🇯🇵日本网站🇯🇵
  - DOMAIN-SUFFIX,jp,🇯🇵日本网站🇯🇵


  - GEOSITE,category-cryptocurrency,🪙加密货币🪙



  - GEOSITE,youtube,🌍国外媒体🌍



  - MATCH,⚡自动选择⚡




proxy-groups:
  - name: ⚡自动选择⚡
    type: url-test
    url: https://web.telegram.org
    exclude-filter: RU|俄罗斯|🇷🇺|KR|韩国|🇰🇷
    icon: https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Dark/Speedtest.png
    interval: 300
    lazy: true
    timeout: 2000
    max-failed-times: 2
    tolerance: 50
    proxies: []


  - name: 🧠人工智能🧠
    type: url-test
    url: https://chatgpt.com
    exclude-filter: RU|俄罗斯|🇷🇺|KR|韩国|🇰🇷    #|HK|香港|🇭🇰|US|美国|🇺🇸
    icon: https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Dark/Bot.png
    interval: 300
    lazy: true
    timeout: 2000
    max-failed-times: 2
    tolerance: 50
    proxies: []


  - name: 🌍国外媒体🌍
    type: url-test
    url: https://music.youtube.com
    exclude-filter: RU|俄罗斯|🇷🇺|KR|韩国|🇰🇷|VN|越南|🇻🇳|MY|马来西亚|🇲🇾
    icon: https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Dark/YouTube_Music.png
    interval: 300
    lazy: true
    timeout: 2000
    max-failed-times: 2
    tolerance: 50
    proxies: []


  - name: 🇯🇵日本网站🇯🇵
    type: fallback
    url: https://special.dmm.com
    filter: JP|日本|🇯🇵
    icon: https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Dark/Japan.png
    interval: 300
    lazy: true
    timeout: 2000
    max-failed-times: 2
    tolerance: 50
    proxies: []


  - name: 🪙加密货币🪙
    type: url-test
    url: https://api.binance.com/api/v3/ping
    exclude-filter: RU|俄罗斯|🇷🇺|HK|香港|🇭🇰|US|美国|🇺🇸|CA|加拿大|🇨🇦
    icon: https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Dark/Available_Alt.png
    interval: 300
    lazy: true
    timeout: 2000
    max-failed-times: 2
    tolerance: 50
    proxies: []

```

