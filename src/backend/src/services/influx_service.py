from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS
from typing import List, Dict, Optional, Any
import asyncio
from datetime import datetime
from app.config.env import settings


class InfluxService:
    def __init__(self):
        self.client: Optional[InfluxDBClient] = None
        self.write_api = None
        self.query_api = None
        self.flush_task = None

    def initialize(self):
        """Initialize InfluxDB client and APIs"""
        self.client = InfluxDBClient(
            url=settings.influx.url,
            token=settings.influx.token,
            org=settings.influx.org
        )
        self.write_api = self.client.write_api(write_options=SYNCHRONOUS)
        self.query_api = self.client.query_api()
        
        print(f"✓ InfluxDB client initialized")
        print(f"  URL: {settings.influx.url}")
        print(f"  Org: {settings.influx.org}")
        print(f"  Bucket: {settings.influx.bucket}")

    async def health_check(self) -> bool:
        """Check if InfluxDB is accessible"""
        if not self.query_api:
            return False

        try:
            await self.query_history(range_time="1m")
            return True
        except Exception as e:
            print(f"InfluxDB health check failed: {e}")
            return False

    async def query_history(
        self,
        sensor: Optional[str] = None,
        room: Optional[str] = None,
        range_time: str = "24h"
    ) -> List[Dict[str, Any]]:
        """Query historical sensor data from InfluxDB"""
        if not self.query_api:
            return []

        filters = []
        if sensor:
            filters.append(f'r.sensor == "{sensor}"')
        if room:
            filters.append(f'r.room == "{room}"')

        filter_clause = ""
        if filters:
            filter_clause = f'|> filter(fn: (r) => {" and ".join(filters)})'

        flux_query = f'''
from(bucket: "{settings.influx.bucket}")
  |> range(start: -{range_time})
  {filter_clause}
'''

        try:
            tables = self.query_api.query(flux_query, org=settings.influx.org)
            rows = []
            
            for table in tables:
                for record in table.records:
                    rows.append({
                        "time": record.get_time(),
                        "measurement": record.get_measurement(),
                        "field": record.get_field(),
                        "value": record.get_value(),
                        **record.values
                    })
            
            return rows
        except Exception as e:
            print(f"InfluxDB query failed: {e}")
            raise

    def write_telemetry(
        self,
        room: str,
        sensor_id: str,
        metric: str,
        value: float,
        ts: Optional[int] = None
    ):
        """Write telemetry data to InfluxDB"""
        if not self.write_api:
            return

        timestamp = ts if ts and isinstance(ts, (int, float)) else int(datetime.now().timestamp() * 1000)

        point = (
            Point("telemetry")
            .tag("room", room)
            .tag("sensor_id", sensor_id)
            .tag("metric", metric)
            .field("value", float(value))
            .time(timestamp, WritePrecision.MS)
        )

        try:
            self.write_api.write(
                bucket=settings.influx.bucket,
                org=settings.influx.org,
                record=point
            )
        except Exception as e:
            print(f"Failed to write telemetry: {e}")

    async def flush(self):
        """Flush any pending writes"""
        if self.write_api:
            try:
                self.write_api.flush()
            except Exception as e:
                print(f"InfluxDB flush failed: {e}")

    def close(self):
        """Close InfluxDB client connection"""
        if self.client:
            self.client.close()
            print("InfluxDB connection closed")


# Singleton instance
influx_service = InfluxService()