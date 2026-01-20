import asyncio
from bleak import BleakScanner, BleakClient

class BLEInfo:
    def __init__(self, name: str, address: str, rssi: int, service_uuids: list[str]):
        self.name = name
        self.address = address
        self.rssi = rssi
        self.service_uuids = service_uuids

def print_with_bool(msg: str, value: bool):
    if value:
        print(msg)

async def scan_ble(target_name: str, print_info: bool = False, scan_duration: int = 10):
    print(f"🔍 Scan BLE pendant {scan_duration} secondes...\n")

    dic = await BleakScanner.discover(timeout=scan_duration, return_adv=True)
    ble_devices = []
    found_target = False

    for value in dic.values():

        device, adv = value[0], value[1]
        name = device.name or adv.local_name or "Inconnu"
        if name is None or name == "Inconnu":
            continue

        this_ble = BLEInfo(
            name=name,
            address=device.address,
            rssi=adv.rssi,
            service_uuids=adv.service_uuids
        )
        ble_devices.append(this_ble)

        print_with_bool("📡 Device trouvé", print_info)
        print_with_bool(f"   Nom     : {this_ble.name}", print_info)
        print_with_bool(f"   MAC     : {this_ble.address}", print_info)
        print_with_bool(f"   RSSI    : {this_ble.rssi} dBm", print_info)
        print_with_bool(f"   SERVICES UUID    : {this_ble.service_uuids}", print_info)

        if this_ble.name == target_name:
            print_with_bool(f"   ✅ >>> {target_name} détecté ! <<<", print_info)
            
            async with BleakClient(this_ble.address) as client:
                # On vérifie la connexion
                if not client.is_connected:
                    print_with_bool("❌ Connexion échouée", print_info)
                    return

                # On récupère les services
                for service in client.services:
                    print_with_bool(f"🧩 Service UUID: {service.uuid}", print_info)

                    for char in service.characteristics:
                        props = ", ".join(char.properties)
                        print_with_bool(f"   🔹 Char UUID: {char.uuid}", print_info)
                        print_with_bool(f"      Propriétés: {props}", print_info)

                        if "notify" in char.properties:
                            print_with_bool("      🔔 >>> NOTIFY DISPONIBLE <<<", print_info)

                    print_with_bool("-" * 20, print_info)
            found_target = True

        if print_info:
            print_with_bool("-" * 20, print_info)

    if not found_target:
        print_with_bool(f"❌ '{target_name}' non détecté.", print_info)

    return ble_devices

if __name__ == "__main__":
    TARGET_NAME = input("Donner le réseau à rechercher (ex: 'ESP32 EcoGuard') : ")
    devices = asyncio.run(scan_ble(TARGET_NAME, print_info=True, scan_duration=10))