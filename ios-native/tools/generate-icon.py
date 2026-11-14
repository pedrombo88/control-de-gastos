#!/usr/bin/env python3
"""Genera el icono iOS desde el mismo icon.svg que utilizan la web y la PWA.
Solo biblioteca estándar Python. Ejecutar desde la raíz del repositorio.
"""
from pathlib import Path
import re
import struct
import xml.etree.ElementTree as ET
import zlib

ROOT = Path(__file__).resolve().parents[2]
SVG = ROOT / 'icon.svg'
OUT = ROOT / 'ios-native/Sources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png'
BRAND = ROOT / 'ios-native/Sources/Assets.xcassets/BudvivaMark.imageset'
SIZE = 1024
SCALE = 1

def unpack_path(data):
    """Extrae los subtrazados M/H/V/L/C/Z del símbolo SVG aprobado."""
    tokens = re.findall(r'[MHLVCZ]|-?(?:\d+\.?\d*|\.\d+)', data)
    polygons, points = [], []
    x = y = 0.0
    start = (0.0, 0.0)
    i = 0
    while i < len(tokens):
        cmd = tokens[i]
        i += 1
        if cmd == 'M':
            if points:
                polygons.append(points)
            x, y = float(tokens[i]), float(tokens[i+1])
            i += 2
            points = [(x, y)]
            start = (x, y)
        elif cmd == 'H':
            x = float(tokens[i])
            i += 1
            points.append((x, y))
        elif cmd == 'V':
            y = float(tokens[i])
            i += 1
            points.append((x, y))
        elif cmd == 'L':
            x, y = float(tokens[i]), float(tokens[i+1])
            i += 2
            points.append((x, y))
        elif cmd == 'C':
            x1, y1, x2, y2, x3, y3 = (float(v) for v in tokens[i:i+6])
            i += 6
            x0, y0 = x, y
            for step in range(1, 25):
                t = step / 24.0
                a = 1-t
                points.append((a**3*x0+3*a*a*t*x1+3*a*t*t*x2+t**3*x3,
                               a**3*y0+3*a*a*t*y1+3*a*t*t*y2+t**3*y3))
            x, y = x3, y3
        elif cmd == 'Z':
            if points:
                polygons.append(points)
                points = []
            x, y = start
        else:
            raise ValueError('Comando SVG no admitido: ' + cmd)
    if points:
        polygons.append(points)
    return polygons

def fill_polygons(pixels, width, paths, color):
    """Relleno even-odd: deja abiertas las dos contraformas de la B."""
    edges = []
    for polygon in paths:
        for p, q in zip(polygon, polygon[1:] + polygon[:1]):
            if p[1] != q[1]:
                edges.append((p[0], p[1], q[0], q[1]))
    for yy in range(width):
        yc = (yy+0.5)/SCALE
        cuts = []
        for x0, y0, x1, y1 in edges:
            if min(y0,y1) <= yc < max(y0,y1):
                cuts.append((x0+(yc-y0)*(x1-x0)/(y1-y0))*SCALE)
        cuts.sort()
        for a, b in zip(cuts[::2], cuts[1::2]):
            left = max(0, int(a+0.5))
            right = min(width, int(b+0.5))
            if right > left:
                offset = (yy*width+left)*3
                pixels[offset:offset+(right-left)*3] = bytes(color)*(right-left)

def png_chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind+data)&0xffffffff)

def write_png(path, pixels, width):
    raw = b''.join(b'\0'+pixels[row*width*3:(row+1)*width*3] for row in range(width))
    png = b'\x89PNG\r\n\x1a\n'+png_chunk(b'IHDR',struct.pack('>IIBBBBB',width,width,8,2,0,0,0))
    png += png_chunk(b'IDAT',zlib.compress(raw,9)) + png_chunk(b'IEND',b'')
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_bytes(png)
    print('Icono Budviva', width, 'x', width, 'generado:', path)

def main():
    root = ET.parse(SVG).getroot()
    pixels = bytearray(bytes.fromhex('09234B')*(SIZE*SIZE))
    for shape in root:
        if shape.tag.endswith('path'):
            color = bytes.fromhex(shape.attrib['fill'].lstrip('#'))
            fill_polygons(pixels,SIZE,unpack_path(shape.attrib['d']),color)
    write_png(OUT,pixels,SIZE)
    write_png(BRAND/'BudvivaMark.png',pixels,SIZE)

if __name__ == '__main__':
    main()
