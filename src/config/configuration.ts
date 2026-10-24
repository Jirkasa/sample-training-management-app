import path from 'path';

const configuration = () => ({
  database: {
    name: process.env.DB_NAME ?? ':memory:',
    debug: process.env.DB_DEBUG === 'true',
  },
  dataDir: process.env.DATA_DIR ?? path.resolve(process.cwd(), 'data'),
  renewalDaysBeforeExpiry: parseNumber(process.env.RENEWAL_DAYS_BEFORE_EXPIRY, 60),
});

export type AppConfig = ReturnType<typeof configuration>;

export default configuration;

function parseNumber(value: string | undefined, defaultValue: number): number {
  const number = Number(value);
  return value && Number.isInteger(number) && number >= 0 ? number : defaultValue;
}
