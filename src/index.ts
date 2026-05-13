interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * NASA POWER MCP — Prediction of Worldwide Energy Resources
 *
 * Solar + meteorology for agriculture, renewables, sustainable buildings.
 * Global coverage, decades of history (1981-present for most variables).
 *
 * API docs: https://power.larc.nasa.gov/docs/services/api/
 * Auth: none.
 */


const BASE = 'https://power.larc.nasa.gov/api';

const DEFAULT_PARAMS = 'T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,ALLSKY_SFC_SW_DWN,RH2M,WS10M';

const tools: McpToolExport['tools'] = [
  {
    name: 'point_data',
    description:
      'Time-series observations for a single coordinate. Temporal granularity controlled by the dates supplied — both must be YYYYMMDD; use daily by default.',
    inputSchema: {
      type: 'object',
      properties: {
        latitude: { type: 'number', description: 'Latitude in degrees (-90 to 90)' },
        longitude: { type: 'number', description: 'Longitude in degrees (-180 to 180)' },
        start: { type: 'string', description: 'Start date YYYYMMDD' },
        end: { type: 'string', description: 'End date YYYYMMDD' },
        parameters: {
          type: 'string',
          description: 'Comma-separated POWER parameter codes (default T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,ALLSKY_SFC_SW_DWN,RH2M,WS10M)',
        },
        community: {
          type: 'string',
          description: 'AG (agriculture, default) | RE (renewable energy) | SB (sustainable buildings)',
        },
        temporal: {
          type: 'string',
          description: 'hourly | daily (default) | monthly',
        },
      },
      required: ['latitude', 'longitude', 'start', 'end'],
    },
  },
  {
    name: 'climatology',
    description: 'Long-term monthly climatology averages for a coordinate.',
    inputSchema: {
      type: 'object',
      properties: {
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        parameters: { type: 'string' },
        community: { type: 'string' },
      },
      required: ['latitude', 'longitude'],
    },
  },
  {
    name: 'regional_data',
    description:
      'Bounding-box query — daily or monthly data over a rectangular region. Bbox area max ~10° × 10°.',
    inputSchema: {
      type: 'object',
      properties: {
        latitude_min: { type: 'number' },
        latitude_max: { type: 'number' },
        longitude_min: { type: 'number' },
        longitude_max: { type: 'number' },
        start: { type: 'string', description: 'YYYYMMDD' },
        end: { type: 'string', description: 'YYYYMMDD' },
        parameters: { type: 'string' },
        community: { type: 'string' },
        temporal: { type: 'string', description: 'daily (default) | monthly' },
      },
      required: ['latitude_min', 'latitude_max', 'longitude_min', 'longitude_max', 'start', 'end'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const community = (args.community as string)?.toUpperCase() ?? 'AG';
  const parameters = (args.parameters as string) ?? DEFAULT_PARAMS;
  switch (name) {
    case 'point_data':
      return pointData(args, community, parameters);
    case 'climatology':
      return climatology(args, community, parameters);
    case 'regional_data':
      return regionalData(args, community, parameters);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function pointData(args: Record<string, unknown>, community: string, parameters: string) {
  const temporal = ((args.temporal as string) ?? 'daily').toLowerCase();
  const params = new URLSearchParams({
    parameters,
    community,
    longitude: String(reqNum(args, 'longitude', '-122.4194')),
    latitude: String(reqNum(args, 'latitude', '37.7749')),
    start: reqStr(args, 'start', '"20240101"'),
    end: reqStr(args, 'end', '"20240131"'),
    format: 'JSON',
  });
  return powerGet(`/temporal/${temporal}/point?${params}`);
}

async function climatology(args: Record<string, unknown>, community: string, parameters: string) {
  const params = new URLSearchParams({
    parameters,
    community,
    longitude: String(reqNum(args, 'longitude', '-122.4194')),
    latitude: String(reqNum(args, 'latitude', '37.7749')),
    format: 'JSON',
  });
  return powerGet(`/temporal/climatology/point?${params}`);
}

async function regionalData(args: Record<string, unknown>, community: string, parameters: string) {
  const temporal = ((args.temporal as string) ?? 'daily').toLowerCase();
  const params = new URLSearchParams({
    parameters,
    community,
    'latitude-min': String(reqNum(args, 'latitude_min', '37')),
    'latitude-max': String(reqNum(args, 'latitude_max', '38')),
    'longitude-min': String(reqNum(args, 'longitude_min', '-123')),
    'longitude-max': String(reqNum(args, 'longitude_max', '-122')),
    start: reqStr(args, 'start', '"20240101"'),
    end: reqStr(args, 'end', '"20240131"'),
    format: 'JSON',
  });
  return powerGet(`/temporal/${temporal}/regional?${params}`);
}

async function powerGet(path: string) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (res.status === 422) {
    const t = await res.text();
    throw new Error(`NASA POWER bad request: ${t.slice(0, 300)}`);
  }
  if (res.status === 429) throw new Error('NASA POWER: rate-limit (HTTP 429)');
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`NASA POWER error: ${res.status} ${t.slice(0, 200)}`);
  }
  return res.json();
}

function reqStr(args: Record<string, unknown>, key: string, example: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) {
    throw new Error(`Required argument "${key}" is missing. Pass a string like ${example}.`);
  }
  return v;
}
function reqNum(args: Record<string, unknown>, key: string, example: string): number {
  const v = args[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new Error(`Required argument "${key}" must be a number. Example: ${example}.`);
  }
  return v;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
