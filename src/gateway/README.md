# EcoGuard 360 - BLE -> MQTT Gateway

Bridge BLE -> MQTT asynchrone (AsyncIO) pour EcoGuard 360.

## Variables d'environnement

### MQTT

- `MQTT_HOST` (defaut: `localhost`)
- `MQTT_PORT` (defaut: `1883`)
- `MQTT_USERNAME`
- `MQTT_PASSWORD`
- `MQTT_TLS` (`true`/`false`, defaut: `false`)
- `MQTT_TLS_CA` (chemin CA, optionnel)
- `MQTT_TLS_INSECURE` (`true`/`false`, defaut: `false`)

### BLE

- `BLE_SENSORS` : liste de capteurs, separes par des virgules.

Format d'un capteur :

```
sensor_id|room|name|address|telemetry_uuid|command_uuid|mode|read_interval|metric|simulated
```

Exemple :

```
BLE_SENSORS="ble-01|C4|EcoSensor||12345678-1234-5678-1234-56789abcdef0|87654321-1234-5678-1234-56789abcdef0|notify|2|temperature|false"
```

Notes :
- `name` ou `address` peut etre vide si l'autre est fourni.
- `mode` = `notify` (prioritaire) ou `read`.
- `read_interval` en secondes.
- `metric` est le nom par defaut si le payload BLE ne contient pas `metric`.
- `simulated=true` active un capteur fake (utile en dev).

Autres variables :

- `BLE_SCAN_INTERVAL` (defaut: `5`)
- `BLE_RECONNECT_DELAY` (defaut: `5`)

Si `BLE_SENSORS` est vide, un capteur simule est demarre automatiquement.

## Lancement

```bash
pip install -r requirements.txt
python app/main.py
```

## Flux MQTT

### Telemetrie (BLE -> MQTT)

Topic :

```
sensors/<sensor_id>/telemetry
```

Payload :

```json
{
  "room": "C4",
  "sensor_id": "ble-01",
  "metric": "temperature",
  "value": 23.7,
  "ts": 1700000000
}
```

### Etat capteur (Proxy LWT)

Topic :

```
sensors/<sensor_id>/status
```

Payload :

```json
{ "status": "ONLINE", "ts": 1700000000 }
```

ou

```json
{ "status": "OFFLINE", "ts": 1700000000, "reason": "ble_disconnect" }
```

### Commandes (MQTT -> BLE)

Subscribe :

```
sensors/<sensor_id>/command
```

ACK :

```
sensors/<sensor_id>/ack
```

## Notes de dev

- Le payload BLE accepte JSON (avec `metric`/`value`), `metric:value`, ou une valeur numerique brute.
- Les commandes sont envoyees en JSON sur `command_uuid`.
