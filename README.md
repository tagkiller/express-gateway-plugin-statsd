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
              measurement: request_duration
              statsdConfig:
                host: localhost
                database: api_gw_requests
                port: 8082
...
```
## Tags

The duration is tagged with the following list of tags:

      path: req.path,
      host: req.hostname,
      verb: req.method,
      status: res.statusCode,x
      application: _application_

ids and uuid in the path are replaced by _id_ using the following default regex :
`/([\da-fA-F]{8}\-[\da-fA-F]{4}\-[\da-fA-F]{4}\-[\da-fA-F]{4}\-[\da-fA-F]{12})|(\d+)/g`

## Configuration available

- `measurement` : (string) 'Measurement name (default: requests)'
- `application`: (string) 'The application name that you monitor (default: default)'
- `removeIds`: (boolean) 'Whether to remove Ids from the path that are sent to metrics or not (default: false)'
- `removeIdsRegex`: (string) 'Regex to use to match ids to remove from the path tag'
- `statsdConfig`
    - `host`: (string) 'The HTTP endpoint when using the remote sampler (default: localhost)'
    - `port`: (number) 'The http port (default: 8086)'
    - `protocol`: (string) 'http/https ... (default: http)'
    - `database`: (string) 'Database in which to send the data'
    - `username`: (string) 'Username to connect to the database (default: root)'
    - `password`: (string) 'Password to connect to the database (default: root)'

