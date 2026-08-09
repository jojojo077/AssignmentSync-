const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { clientOrigin, nodeEnv } = require('./config/env');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// App is built separately from the server (index.js) so tests can
// `require('../src/app')` and hit it with supertest without opening
// a real network port.
const app = express();

app.use(helmet());
app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json());
if (nodeEnv !== 'test') {
  app.use(morgan(nodeEnv === 'production' ? 'combined' : 'dev'));
}

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
