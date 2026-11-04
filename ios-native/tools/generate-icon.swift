// Genera un icono opaco original de 1024x1024 para Budviva, sin dependencias externas.
import AppKit
import Foundation

let width=1024,height=1024
guard let image=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:width,pixelsHigh:height,
      bitsPerSample:8,samplesPerPixel:3,hasAlpha:false,isPlanar:false,
      colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0) else {
    fatalError("No se pudo crear el bitmap")
}
let saved=NSGraphicsContext.current
NSGraphicsContext.current=NSGraphicsContext(bitmapImageRep:image)
NSGraphicsContext.current?.imageInterpolation = .high
defer {NSGraphicsContext.current=saved}
NSColor(calibratedRed:0.055,green:0.15,blue:0.29,alpha:1).setFill()
NSRect(x:0,y:0,width:width,height:height).fill()
let circle=NSBezierPath(ovalIn:NSRect(x:90,y:90,width:844,height:844))
let grad=NSGradient(starting:NSColor(calibratedRed:0.08,green:0.55,blue:0.73,alpha:1),
                    ending:NSColor(calibratedRed:0.08,green:0.78,blue:0.64,alpha:1))
grad?.draw(in:circle,angle:-45)
let letter="B" as NSString
let font=NSFont.systemFont(ofSize:650,weight:.heavy)
let attributes:[NSAttributedString.Key:Any]=[
    .font:font,.foregroundColor:NSColor.white,
    .kern:-28
]
let size=letter.size(withAttributes:attributes)
letter.draw(at:NSPoint(x:(CGFloat(width)-size.width)/2-7,
      y:(CGFloat(height)-size.height)/2+8),withAttributes:attributes)
guard let png=image.representation(using:.png,properties:[:]) else{fatalError("No se pudo generar PNG")}
let path="ios-native/Sources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png"
try FileManager.default.createDirectory(at:URL(fileURLWithPath:path).deletingLastPathComponent(),
     withIntermediateDirectories:true)
try png.write(to:URL(fileURLWithPath:path),options:.atomic)
print("Icono creado: \(path) · \(png.count) bytes")
