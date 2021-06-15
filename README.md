# express-gateway-plugin-influx
A simple Statsd Client plugin for Express Gateway.

## Installation

Simply copy/paste :

`eg plugin install express-gateway-plugin-statsd`

## Usage

Here is an example of how to use the plugin :

```
...
pipelines:
  default:
    policies:
      - statsd:
          - action:
              statsdConfig:
                host: localhost
                database: api_gw_requests
                port: 8082
...
```

ids and uuid in the path are replaced by _id_ using the following default regex :
`/([\da-fA-F]{8}\-[\da-fA-F]{4}\-[\da-fA-F]{4}\-[\da-fA-F]{4}\-[\da-fA-F]{12})|(\d+)/g`

## Configuration available

- `removeIds`: (boolean) 'Whether to remove Ids from the path that are sent to metrics or not (default: false)'
- `removeIdsRegex`: (string) 'Regex to use to match ids to remove from the path tag'
- `statsdConfig`
    - `host`: (string) 'Where to send the stats (default: localhost)'
    - `port`: (number) 'The http port (default: 8125)'
    - `prefix`: (string) 'Prefix all stats with this value (default "")'

