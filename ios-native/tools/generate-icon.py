#!/usr/bin/env python3
"""Genera la B vectorial de Budviva en PNG 1024×1024 sin librerías externas.
El contorno replica icon.svg y BudvivaBrandMark de SwiftUI.
"""
import math
import pathlib
import struct
import zlib

OUT = pathlib.Path("ios-native/Sources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png")
SIZE = 1024

def cubic(a, b, c, d, t):
    u = 1.0 - t
    return (u*u*u*a + 3*u*u*t*b + 3*u*t*t*c + t*t*t*d)

def path_points():
    pts = [(0.24,0.17),(0.52,0.17)]
    for start,c1,c2,end in [
        ((0.52,0.17),(0.82,0.17),(0.87,0.38),(0.74,0.46)),
        ((0.74,0.46),(0.93,0.55),(0.83,0.83),(0.55,0.83))
    ]:
        for i in range(1,201):
            t = i/200
            pts.append((cubic(start[0],c1[0],c2[0],end[0],t),
                        cubic(start[1],c1[1],c2[1],end[1],t)))
    pts.extend([(0.24,0.83),(0.24,0.17)])
    return pts

# Para cada fila, calcular el contorno izquierdo y derecho de la B.
edges = list(zip(path_points(),path_points()[1:]))
bounds = []
for y in range(SIZE):
    yy = (y+0.5)/SIZE
    crosses = []
    for (x1,y1),(x2,y2) in edges:
        if (y1 <= yy < y2) or (y2 <= yy < y1):
            crosses.append(x1+(yy-y1)*(x2-x1)/(y2-y1))
    crosses.sort()
    bounds.append((crosses[0],crosses[-1]) if len(crosses)>=2 else (1,0))

def round_rect_sdf(x,y,cx,cy,w,h,r):
    qx = abs(x-cx) - (w/2-r)
    qy = abs(y-cy) - (h/2-r)
    return math.hypot(max(qx,0),max(qy,0))+min(max(qx,qy),0)-r

def clamp(v):
    return 0 if v<0 else (1 if v>1 else v)

def png_chunk(tag,data):
    return struct.pack(">I",len(data))+tag+data+struct.pack(">I",zlib.crc32(tag+data)&0xffffffff)

rows=[]
for y in range(SIZE):
    yy=(y+0.5)/SIZE
    left,right=bounds[y]
    row=bytearray()
    for x in range(SIZE):
        xx=(x+0.5)/SIZE
        # Fondo carbón con leve matiz azul; neutro y reconocible.
        bg=(int(18+8*yy),int(35+5*xx),int(46+7*xx))
        # B con dos contraformas, no un glifo tipográfico deformado.
        outer=min((xx-left),(right-xx),(yy-0.17),(0.83-yy))*SIZE
        hole1=round_rect_sdf(xx,yy,0.525,0.35,0.21,0.12,0.055)*SIZE
        hole2=round_rect_sdf(xx,yy,0.54,0.63,0.24,0.14,0.07)*SIZE
        glyph=clamp(outer+0.5)*clamp(min(hole1,hole2)+0.5)
        # Punto de identidad verde salvia arriba a la derecha.
        dot=math.hypot(xx-0.79,yy-0.20)
        accent=clamp((0.0475-dot)*SIZE+0.5)
        white=(250,251,249)
        jade=(140,220,173)
        rgb=tuple(int(bg[i]*(1-glyph)+white[i]*glyph) for i in range(3))
        rgb=tuple(int(rgb[i]*(1-accent)+jade[i]*accent) for i in range(3))
        row.extend(rgb)
    rows.append(b"\x00"+bytes(row))
body=b"".join(rows)
png=b"\x89PNG\r\n\x1a\n"+png_chunk(b"IHDR",struct.pack(">IIBBBBB",SIZE,SIZE,8,2,0,0,0))
png+=png_chunk(b"IDAT",zlib.compress(body,8))+png_chunk(b"IEND",b"")
OUT.parent.mkdir(parents=True,exist_ok=True)
OUT.write_bytes(png)
print(f"Budviva · icono 1024px: {OUT} ({len(png)} bytes)")
