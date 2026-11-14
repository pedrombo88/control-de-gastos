#!/usr/bin/env python3
"""Budviva: icono original aprobado para App Store y cabecera SwiftUI.
El PNG maestro procede del diseño aceptado por el titular, no de una B redibujada.
Ejecutar desde la raíz; las builds iOS se realizan en macOS.
"""
from pathlib import Path
import platform
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[2]
MASTER = ROOT / "brand-approved.png"
DESTINATIONS = [
    ROOT / "ios-native/Sources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png",
    ROOT / "ios-native/Sources/Assets.xcassets/BudvivaMark.imageset/BudvivaMark.png",
]

def main():
    assert MASTER.exists(), "No existe el PNG del logotipo aprobado: brand-approved.png"
    if shutil.which("sips"):
        for destination in DESTINATIONS:
            destination.parent.mkdir(parents=True,exist_ok=True)
            subprocess.run(["sips","-s","format","png","-z","1024","1024",
                            str(MASTER),"--out",str(destination)],check=True,
                           stdout=subprocess.DEVNULL)
            assert destination.exists() and destination.stat().st_size>1000
            print("Icono Budviva aprobado:",destination)
    else:
        # Fallback útil para preparar los recursos desde Windows/Linux sin Mac.
        try:
            from PIL import Image
        except ImportError as exc:
            raise SystemExit("Instala Pillow o ejecuta el generador en macOS (sips).") from exc
        with Image.open(MASTER) as img:
            icon=img.convert("RGB").resize((1024,1024),Image.Resampling.LANCZOS)
            for destination in DESTINATIONS:
                destination.parent.mkdir(parents=True,exist_ok=True)
                icon.save(destination,format="PNG",optimize=True)
                print("Icono Budviva aprobado:",destination)
if __name__ == "__main__": main()
