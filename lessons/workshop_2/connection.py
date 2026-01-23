import asyncio
import struct
from bleak import BleakScanner, BleakClient

# Information sur le nom du périphérique et l'UUID de la caractéristique
TARGET_NAME = "EcoGuard_GrpX"
CHAR_UUID = "f1047d07-53c8-4877-9c5f-29f7161c516d"

# Fonction permettant de gérer les notifications reçues
async def notification_handler(sender, data):
    """
    Callback appelé à chaque notification reçue
    """
    print(f"📩 Notification depuis {sender}")
    print(f"   Données brutes : {data}")
    
    try:
        data = bytearray(b'\x00\x00\xacA')
        value = struct.unpack('<f', data)[0]
        print(f"   Données décodées : {value}°C")
    except Exception as e:
        pass

    print("-" * 40)

async def main():
    print(f"🔍 Recherche de {TARGET_NAME}...")
    devices = await BleakScanner.discover(timeout=10)

    target_device = None
    for d in devices:
        if d.name == TARGET_NAME:
            target_device = d
            break

    if not target_device:
        print(f"❌ '{TARGET_NAME}' non trouvé")
        return

    print(f"✅ '{TARGET_NAME}' trouvé : {target_device.address}")

    async with BleakClient(target_device.address) as client:
        print(f"🔗 Connecté à {TARGET_NAME}")

        # On vérifie la connexion
        if not client.is_connected:
            print("❌ Connexion échouée")
            return

        print("🔔 Abonnement aux notifications...")
        await client.start_notify(CHAR_UUID, notification_handler)

        print("📡 En attente de notifications (Ctrl+C pour quitter)...\n")
        try:
            while True:
                await asyncio.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Arrêt des notifications")

        await client.stop_notify(CHAR_UUID)

if __name__ == "__main__":
    asyncio.run(main())