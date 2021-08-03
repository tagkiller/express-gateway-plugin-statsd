// @ts-check
/// <reference path="./node_modules/express-gateway/index.d.ts" />
const SDC = require('@fiverr/statsd-client');
const logger = require('express-gateway/lib/logger').gateway;

function getDurationInMilliseconds(start) {
  const NS_PER_SEC = 1e9
  const NS_TO_MS = 1e6
  const diff = process.hrtime(start)

  return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS
}

const plugin = {
  version: '1.0.0',
  policies: ['statsd'],

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
                description: 'Prefix all stats with this value (default "apigateway")',
                default: 'apigateway',
              },
              scheme: {
                type: 'string',
                description: 'scheme to use to format the data (default: "datadog")',
                default: 'datadog',
              },
            },
          },
        },
      },
      policy: (actionParams) => {
        const removeIdsRegex = new RegExp(actionParams.removeIdsRegex, 'g');
        const config = {
          ...actionParams.statsdConfig,          
          sanitise: string => `${string}`.replace((?!\.)\W/g, '_').toLowerCase(),
          errorHandler: (error, data) => logger.error(`${error} - data : ${JSON.stringify(data)}`)
        }

        const sdc = new SDC(config);

        function writePoint(start, req, res) {
          const duration = getDurationInMilliseconds(start);
          const path = actionParams.removeIds ? req.path.replace(removeIdsRegex, '_id_') : req.path;

          sdc.time('request_duration', new Date(Date.now() - duration), {
            tags: {
              path: path,
              method: req.method,
              status_code: res.statusCode,
              host: req.hostname,
              service: 'apigateway',
            },
          });
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
