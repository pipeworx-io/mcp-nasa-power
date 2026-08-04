# @pipeworx/nasa-power

NASA POWER MCP — solar irradiance and meteorology for agriculture / renewable energy modeling. Global coverage, decades of history. No auth.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

- `point_data(latitude, longitude, start, end, parameters?, community?)` — hourly/daily/monthly observations for a single coordinate
- `climatology(latitude, longitude, parameters?, community?)` — long-term monthly averages
- `regional_data(latitude_min, latitude_max, longitude_min, longitude_max, start, end, parameters?, community?)` — bbox query

## Common parameters

- `ALLSKY_SFC_SW_DWN` — solar irradiance (kWh/m²/day)
- `T2M`, `T2M_MAX`, `T2M_MIN` — 2-meter temperature
- `PRECTOTCORR` — precipitation
- `RH2M` — relative humidity
- `WS10M` — wind speed at 10m

Communities (decides parameter set): `AG` (agriculture, default), `RE` (renewable energy), `SB` (sustainable buildings).

## Data source

`https://power.larc.nasa.gov/api/` — public, no auth.

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "nasa-power": {
      "url": "https://gateway.pipeworx.io/nasa-power/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Nasa Power data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
