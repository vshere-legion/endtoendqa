export const schConfig = {
  baseURL: process.env.SCH_BASE_URL || process.env.BASE_URL,
  apiURL: process.env.SCH_API_URL || process.env.API_URL,

  // Schedule shift flow test configuration
  schedule: {
    testClassName: 'HardStopForMinorViolation',
    defaultRole: 'InternalAdmin',
    defaultWorkRole: 'Cafe',
    defaultStartTime: '9:00 AM',
    defaultEndTime: '1:00 PM',
  },
};
