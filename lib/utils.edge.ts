// Edge utilities. Cannot run Node APIs.

export const getAppHost = (subdomain?: string, forceProduction?: boolean) => {
  const host =
    forceProduction || process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_APP_HOSTNAME
      : 'localhost:3000';
  return subdomain ? `${subdomain}.${host}` : host;
};

export const removeSchema = (origin: string) => {
  return origin.replace(/(^\w+:|^)\/\//, '');
};

export const safeParseInt = (value: any, defaultValue = 0) => {
  try {
    return parseInt(value);
  } catch {
    // Do nothing
  }
  return defaultValue;
};
