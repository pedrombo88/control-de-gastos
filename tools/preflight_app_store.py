#!/usr/bin/env python3
"""Auditoría no destructiva previa a TestFlight y App Store.

Ejecuta: python3 tools/preflight_app_store.py
Para bloquear una release: python3 tools/preflight_app_store.py --strict
No consulta Apple Developer ni sustituye la aprobación jurídica o de App Review.
"""
import argparse
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
def read(path):
    return (ROOT/path).read_text(encoding="utf-8")

def run():
    parser=argparse.ArgumentParser()
    parser.add_argument("--strict",action="store_true",help="Salir con error si falta algún requisito")
    args=parser.parse_args()
    meta=json.loads(read("docs/APP_STORE_FICHA_ES_2026.json"))
    project=read("ios-native/project.yml")
    auth=read("ios-native/Sources/BudvivaAuth.swift")
    settings=read("ios-native/Sources/SettingsScreens.swift")
    root=read("ios-native/Sources/BudvivaApp.swift")
    delete=read("ios-native/Sources/DeleteAccountScreen.swift")
    guard=read("ios-native/Sources/LocalAccountGuard.swift")
    privacy=read("privacidad.html")
    requirements=[]
    def check(label,condition,blocker=True):
        requirements.append((label,bool(condition),blocker))
    version=re.search(r'CFBundleShortVersionString:\s*"([^"]+)"',project)
    bundle=re.search(r'PRODUCT_BUNDLE_IDENTIFIER:\s*(\S+)',project)
    v=version.group(1) if version else None
    b=bundle.group(1) if bundle else None
    check("Version iOS y ficha coinciden",bool(v) and meta.get("version")==v+"-beta")
    check("Bundle ID comercial reservado (no com.example)",bool(b) and not b.startswith("com.example.") and re.fullmatch(r"[A-Za-z0-9.-]+",b))
    check("Pantalla de eliminación visible en Ajustes",'budviva-delete-account' in settings)
    check("Baja con reautenticación y confirmación",all(x in delete for x in ('email_otp','ELIMINAR CUENTA','bv-delete-account')))
    check("Protección frente a cambio de cuenta",all(x in root+guard for x in ('BudvivaLocalAccountGuard','BudvivaOtherAccountScreen','checkOrBind')))
    check("Acceso OTP compatible con el correo de 8 cifras",all(x in auth for x in ('code.count == 8','Código de 8 cifras')))
    check("Enlaces de privacidad y ayuda definidos",all(meta.get(x,"").startswith("https://") for x in ('privacyPolicyURL','supportURL','privacyChoicesURL')))
    check("Metadatos App Store dentro de límites",len(meta['appName'])<=30 and len(meta['subtitle'])<=30 and len(meta['description'])<=4000 and len(meta['promotionalText'])<=170 and len(meta['keywords'].encode('utf8'))<=100)
    check("Identificación definitiva del responsable (no texto beta)",'identificación legal del responsable' not in privacy.lower() and 'pendientes' not in privacy.lower() and 'fase beta' not in privacy.lower())
    check("Fotos reales para la ficha App Store",any((ROOT/"release"/"screenshots").glob("*.png")) if (ROOT/"release"/"screenshots").exists() else False)
    check("Ficha de publicación confirmada, no borrador",meta.get("availability")=="READY_TO_SUBMIT")
    check("Enlace a soporte válido", (ROOT/"soporte.html").exists())
    check("Precio, fiscalidad, privacidad y revisión Apple validados",False)
    check("Cuenta Apple Developer activa y distribución firmada con TestFlight",False)
    print(f"Budviva iOS {v or 'desconocida'} · {b or 'Bundle ID no definido'}")
    problems=[label for label,passed,blocking in requirements if not passed and blocking]
    for label,ok,required in requirements:
        print(("OK   " if ok else ("P0   " if required else "INFO ")) + label)
    print(f"\nResultado: {len(requirements)-len(problems)}/{len(requirements)} comprobaciones superadas.")
    if problems:
        print("NO LISTA PARA ENVIAR A APP REVIEW. Pendientes: "+str(len(problems)))
    if args.strict and problems:
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(run())
