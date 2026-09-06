const DEFAULT_PORT = 3310;

const parsePort = (value: string | undefined): number => {
  if (value == null) {
    return DEFAULT_PORT;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("APP_PORT must be an integer between 1 and 65535");
  }

  return port;
};

const environment = Object.freeze({
  clientUrl: process.env.CLIENT_URL,
  port: parsePort(process.env.APP_PORT),
});

export { environment };
