const winston = require('winston')

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
  silent: false, // FIXME: change to true before submitting
})

logger.info('Logger created')

module.exports = { logger }
