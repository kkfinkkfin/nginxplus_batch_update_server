# nginxplus_batch_update_server
# 背景
新增一个接口，实现upstream server全量更新

# nginx.conf
```
。。。
upstream test {
    zone test 64k;
    server 1.1.1.2:80;
    server 1.1.1.3:80;
    server 1.1.1.4:80;
 }
。。。
```

# dashboard.conf
```
js_import /etc/nginx/njs/batch_servers.js;

server {
    listen 8081;
    root /usr/share/nginx/html;
    access_log /var/log/nginx/batch_access.log main;
    error_log /var/log/nginx/batch_error.log warn;

    allow 0.0.0.0/0;

    subrequest_output_buffer_size 200k;

    location  = /dashboard.html {
        root   /usr/share/nginx/html;
    }
    
    location /api {
        api   write=on;
    }

    location /api/9/http/all/upstreams {
        js_content batch_servers.batch_servers;
    }
}
```

# API 接口
```
POST /api/9/http/all/upstreams/{httpupstreamName}/servers   
``` 
1. example 
```
POST http://172.16.240.15:8081/api/9/http/all/upstreams/test
BODY:
[
    {
        "server": "10.10.10.2:80",
        "weight": 1,
        "max_conns": 0,
        "max_fails": 1,
        "fail_timeout": "10s",
        "slow_start": "0s",
        "route": "",
        "backup": false,
        "down": false
    },
    {
        "server": "1.1.1.3:80",
        "weight": 1,
        "max_conns": 0,
        "max_fails": 1,
        "fail_timeout": "10s",
        "slow_start": "0s",
        "route": "",
        "backup": false,
        "down": false
    }
]
```

# NJS 实现逻辑
1. 先查询NGINX upstream 'test' 下的server信息，存入 get_upstream
2. 如果 get_upstream.length 为0 ，则批量调用 plus POST Upstream Server API 插入request body的server
3. 如果 get_upstream.length 不为0, 则与request body 做对比：
    ｜- server对象一样，无操作
    ｜- server对象不一样：
        ｜- server字段一样，调用plus PATCH Upstream Server API
        ｜- server字段不一样，获取get_upstream server ID 先调用plus DELETE Upstream Server API, 再调用plus POST Upstream Server API插入request body server

# PLUS API接口
1. ADD Server
Add a server to an HTTP upstream server group
```
POST /http/upstreams/{httpUpstreamName}/servers/
BODY
{
  "server": "10.0.0.1:8089",
  "weight": 4,
  "max_conns": 0,
  "max_fails": 0,
  "fail_timeout": "10s",
  "slow_start": "10s",
  "route": "",
  "backup": true,
  "down": true
}
```
```
curl -X 'POST' \
  'http://demo.nginx.com/api/9/http/upstreams/test/servers/' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "server": "10.0.0.1:8089",
  "weight": 4,
  "max_conns": 0,
  "max_fails": 0,
  "fail_timeout": "10s",
  "slow_start": "10s",
  "route": "",
  "backup": true,
  "down": true
}'

* test 为upstream名称
```

2. PATCH Server
Modify a server in an HTTP upstream server group
```
PATCH /http/upstreams/{httpUpstreamName}/servers/{httpUpstreamServerId}
BODY 
{
  "server": "10.0.0.2:8089",
  "weight": 4,
  "max_conns": 0,
  "max_fails": 0,
  "fail_timeout": "10s",
  "slow_start": "10s",
  "route": "",
  "backup": true,
  "down": true
}
```
```
curl -X 'PATCH' \
  'http://demo.nginx.com/api/9/http/upstreams/test/servers/2' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "server": "10.0.0.2:8089",
  "weight": 4,
  "max_conns": 0,
  "max_fails": 0,
  "fail_timeout": "10s",
  "slow_start": "10s",
  "route": "",
  "backup": true,
  "down": true
}'

* test 为upstream名称
```

3. DELETE Server

Remove a server from an HTTP upstream server group
```
DELETE /http/upstreams/{httpUpstreamName}/servers/{httpUpstreamServerId}
```
```
curl -X 'DELETE' \
  'http://demo.nginx.com/api/9/http/upstreams/test/servers/2' \
  -H 'accept: application/json'

  * test 为upstream名称
```
