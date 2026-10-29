import { createApp } from './app';
import { config } from './config';

createApp().listen(config.port, () => {
  console.log(`API em http://localhost:${config.port} (${config.env})`);
});
