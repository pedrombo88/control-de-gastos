#!/usr/bin/env python3
"""Icono original, 1024×1024 RGB sin transparencia. Sin AppKit ni dependencias externas."""
import math
import pathlib
import struct
import zlib

OUT = pathlib.Path("ios-native/Sources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png")
SIZE = 1024


def blend(a, b, t):
    t = max(0.0, min(1.0, t))
    return int(a * (1-t) + b * t)


def ellipse(x, y, cx, cy, rx, ry):
    return (math.hypot((x-cx)/rx, (y-cy)/ry)-1.0)*min(rx, ry)


def rect(x, y, cx, cy, w, h):
    dx = abs(x-cx)-w/2
    dy = abs(y-cy)-h/2
    return math.hypot(max(dx,0), max(dy,0)) + min(max(dx,dy),0)


def coverage(distance, edge=1.3):
    return max(0, min(1, 0.5-distance/edge))


rows = []
for y in range(SIZE):
    line = bytearray()
    for x in range(SIZE):
        # Fondo azul noche en suave degradado.
        base = 0.25 * x / SIZE + 0.75 * y / SIZE
        dark = (blend(11, 25, base), blend(35, 68, base), blend(75, 115, base))
        # Monograma circular con acabado verde azulado.
        dist = math.hypot(x-512, y-512)
        circle = coverage(dist-394, 2.0)
        accent=(blend(15, 12, y/SIZE), blend(148, 190, y/SIZE), blend(187, 150, y/SIZE))
        bg = tuple(blend(dark[i], accent[i], circle) for i in range(3))

        # B geométrica blanca con dos contraformas abiertas sobre el círculo.
        outer = min(rect(x,y,362,512,125,495),
                    ellipse(x,y,492,398,200,132),
                    ellipse(x,y,503,622,214,146))
        top_hole = ellipse(x,y,511,394,94,54)
        bottom_hole = ellipse(x,y,516,624,103,60)
        shape = max(outer, -min(top_hole, bottom_hole))
        opacity = coverage(shape,2.0)
        # Luz sutil para un acabado limpio, sin transparencias.
        white = (247, 251, 255)
        rgb = tuple(blend(bg[i], white[i], opacity) for i in range(3))
        line.extend(rgb)
    rows.append(b"\x00"+bytes(line))


def chunk(tag, payload):
    return struct.pack(">I",len(payload))+tag+payload+struct.pack(">I",zlib.crc32(tag+payload)&0xffffffff)


body = b"".join(rows)
png = b"\x89PNG\r\n\x1a\n"
png += chunk(b"IHDR",struct.pack(">IIBBBBB",SIZE,SIZE,8,2,0,0,0))
png += chunk(b"IDAT",zlib.compress(body,9))
png += chunk(b"IEND",b"")
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_bytes(png)
print(f"Icono RGB {SIZE}x{SIZE} generado: {OUT} ({len(png)} bytes)")
