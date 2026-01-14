const { InfluxDB } = require("@influxdata/influxdb-client");
const config = require("../config/env");

class InfluxService {
  constructor() {
    this.client = null;
    this.queryApi = null;
  }

  initialize() {
    this.client = new InfluxDB({ url: config.influx.url, token: config.influx.token });
    this.queryApi = this.client.getQueryApi(config.influx.org);
  }

  async healthCheck() {
    if (!this.queryApi) {
      return false;
    }

    try {
      await this.queryHistory({ range: "1m" });
      return true;
    } catch (error) {
      console.error("InfluxDB health check failed:", error);
      return false;
    }
  }

  async queryHistory({ sensor, room, range }) {
    if (!this.queryApi) {
      return [];
    }

    const safeRange = range || "24h";
    const filters = [];

    if (sensor) {
      filters.push(`r.sensor == "${sensor}"`);
    }
    if (room) {
      filters.push(`r.room == "${room}"`);
    }

    const filterClause = filters.length
      ? `|> filter(fn: (r) => ${filters.join(" and ")})`
      : "";

    const fluxQuery = `
from(bucket: "${config.influx.bucket}")
  |> range(start: -${safeRange})
  ${filterClause}
`;

    const rows = [];
    return new Promise((resolve, reject) => {
      this.queryApi.queryRows(fluxQuery, {
        next(row, tableMeta) {
          rows.push(tableMeta.toObject(row));
        },
        error(error) {
          console.error("InfluxDB query failed:", error);
          reject(error);
        },
        complete() {
          resolve(rows);
        },
      });
    });
  }
}

module.exports = new InfluxService();
