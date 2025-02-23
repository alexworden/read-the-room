export const config = {
  apiUrl: `${import.meta.env.RTR_API_PROTOCOL || 'http'}://${import.meta.env.RTR_API_HOST || 'localhost'}:${import.meta.env.RTR_API_PORT || '3000'}`,
  webUrl: `${import.meta.env.RTR_WEB_PROTOCOL || 'http'}://${import.meta.env.RTR_WEB_HOST || 'localhost'}:${import.meta.env.RTR_WEB_PORT || '4200'}`,
};
