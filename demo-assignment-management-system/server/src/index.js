const app = require('./app');
const { port, nodeEnv } = require('./config/env');

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`AMS server listening on http://localhost:${port} [${nodeEnv}]`);
});
