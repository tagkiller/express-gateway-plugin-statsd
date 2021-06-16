// @ts-check
/// <reference path="./node_modules/express-gateway/index.d.ts" />
const SDC = require('statsd-client');
const logger = require('express-gateway/lib/logger').gateway;

function getDurationInMilliseconds(start) {
  const NS_PER_SEC = 1e9
  const NS_TO_MS = 1e6
  const diff = process.hrtime(start)

  return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS
}

const plugin = {
  version: '1.0.0',
  policies: ['influx'],

  init: pluginContext => {
    pluginContext.registerPolicy({
      name: 'statsd',
      schema: {
        $id: 'http://express-gateway.io/schemas/policies/statsd.json',
        type: 'object',
        properties: {
          removeIdsRegex: {
            type: 'string',
            description: 'Regex to use to match ids to remove from the path tag',
            default: '([0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12})|([0-9]+)',
          },
          removeIds: {
            type: 'boolean',
            description: 'Whether to remove Ids from the path that are sent to metrics or not (default: false)',
            default: false,
          },
          statsdConfig: {
            type: 'object',
            properties: {
              host: {
                type: 'string',
                description: 'Where to send the stats (default: localhost)',
                default: 'localhost',
              },
              port: {
                type: 'number',
                description: 'The http port (default: 8125)',
                default: 8125,
              },
              prefix: {
                type: 'string',
                description: 'Prefix all stats with this value (default "")',
                default: '',
              },
            },
          },
        },
      },
      policy: (actionParams) => {
        logger.debug(`configuring statsd client with the following parameters : ${JSON.stringify(actionParams.influxdbSchema)}`)
        const removeIdsRegex = new RegExp(actionParams.removeIdsRegex, 'g');
        const sdc = new SDC({
          ...actionParams.statsdConfig,
        });

        function writePoint(start, req, res) {
          const duration = getDurationInMilliseconds(start);
          const path = actionParams.removeIds ? req.path.replace(removeIdsRegex, '_id_') : req.path;
          sdc.increment('response_code.' + res.statusCode);
          sdc.increment('response_code' + path + '.' + res.statusCode);
          sdc.timing('response_time' + path, new Date(Date.now() - duration));
        };
        // To avoid memory leak
        function removeListeners(res) {
            res.removeListener('finish', writePoint);
            res.removeListener('error', removeListeners);
            res.removeListener('close', removeListeners);
        }
        return (req, res, next) => {
          const start = process.hrtime();
          // Look at the following doc for the list of events : https://nodejs.org/api/http.html
          res.once('finish', () => writePoint(start, req, res));
          res.once('error', () => removeListeners(res));
          res.once('close', () => removeListeners(res));
          next();
        }
      },
    });
  }
};

module.exports = plugin;