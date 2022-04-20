const winston = require('winston')

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/downcloud.log' }),
  ],
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'MMM-DD-YYYY HH:mm:ss',
    }),
    winston.format.printf(
      (info) => `[${info.level}] - (${[info.timestamp]}): ${info.message}`
    )
  ),
  silent: false, // FIXME: change to true before submitting
})

logger.info('Logger created')

module.exports = { logger }
