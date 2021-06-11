// @ts-check
/// <reference path="./node_modules/express-gateway/index.d.ts" />
const SDC = require('statsd-client');
const logger = require('express-gateway/lib/logger').gateway;
const { performance, PerformanceObserver } = require("perf_hooks")

const perfObserver = new PerformanceObserver((items) => {
  items.getEntries().forEach((entry) => {
    console.log(entry)
  })
})

perfObserver.observe({ entryTypes: ["measure"], buffered: true })

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
          measurement: {
            type: 'string',
            description: 'Measurement name',
            default: 'requests',
          },
          application: {
            type: 'string',
            description: 'The name of the application that you monitor (default: default)',
            default: 'default',
          },
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
          bufferSize: {
            type: 'number',
            description: 'The size to match before sending the data to influx',
            default: 100,
          },
          delay: {
            type: 'number',
            description: 'The time to wait before sending the data to influx',
            default: 5000,
          },
          statsdConfig: {
            type: 'object',
            properties: {
              host: {
                type: 'string',
                description: 'The HTTP endpoint when using the remote sampler (default: localhost)',
                default: 'localhost',
              },
              port: {
                type: 'number',
                description: 'The http port (default: 8086)',
                default: 8086,
              },
              prefix: {
                type: 'string',
                description: 'Prefix all stats with this value (default "")',
                default: '',
              },
              database: {
                type: 'string',
                description: 'Database in which to send the data'
              },
              username: {
                type: 'string',
                description: 'Username to connect to the database (default: root)',
                default: 'root',
              },
              password: {
                type: 'string',
                description: 'Password to connect to the database (default: root)',
                default: 'root',
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
          performance.mark('regex-start');
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
            performance.mark('listening-end')
            performance.measure('listening', 'listening-start', 'listening-end')
        }

        return (req, res, next) => {
          const start = process.hrtime();
          performance.mark('listening-start');
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