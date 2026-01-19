const { InfluxDB, Point } = require("@influxdata/influxdb-client");
const config = require("../config/env");

class InfluxService {
  constructor() {
    this.client = null;
    this.queryApi = null;
    this.writeApi = null;
    this.flushTimer = null;
  }

  initialize() {
    this.client = new InfluxDB({ url: config.influx.url, token: config.influx.token });
    this.queryApi = this.client.getQueryApi(config.influx.org);
    this.writeApi = this.client.getWriteApi(
      config.influx.org,
      config.influx.bucket,
      "ms"
    );
    console.log(this.client);
    console.log(this.queryApi);
    console.log(this.writeApi);

    if (!this.flushTimer) {
      this.flushTimer = setInterval(() => {
        this.flush().catch((error) => {
          console.error("InfluxDB flush failed:", error);
        });
      }, 5000);
    }
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

  writeTelemetry({ room, sensor_id, metric, value, ts }) {
    if (!this.writeApi) {
      return;
    }

    const timestamp = Number.isFinite(Number(ts)) ? Number(ts) : Date.now();
    const numericValue = Number(value);

    const point = new Point("telemetry")
      .tag("room", room)
      .tag("sensor_id", sensor_id)
      .tag("metric", metric)
      .floatField("value", numericValue)
      .timestamp(timestamp);

    this.writeApi.writePoint(point);
  }

  async flush() {
    if (this.writeApi) {
      await this.writeApi.flush();
    }
  }
}

module.exports = new InfluxService();
