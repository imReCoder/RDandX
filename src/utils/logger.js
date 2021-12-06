const { createLogger, format, transports } = require('winston');
const { combine, timestamp, colorize, printf } = format;

const level = process.env.LOG_LEVEL || 'debug';

const myFormat = printf(({ level, message, label, timestamp }) => {
	return `${timestamp} ${level}: ${message}`;
});

const Logger = createLogger({
	format: combine(colorize(), timestamp(), myFormat),
	transports: [new transports.Console()]
});

module.exports = Logger;