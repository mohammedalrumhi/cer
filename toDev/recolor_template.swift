import AppKit
import CoreGraphics
import Foundation

struct Variant {
  let fileName: String
  let red: UInt8
  let green: UInt8
  let blue: UInt8
}

let variants = [
  Variant(fileName: "itqan-template-5-emerald.png", red: 0x2F, green: 0x8F, blue: 0x6B),
  Variant(fileName: "itqan-template-5-burgundy.png", red: 0x9A, green: 0x4E, blue: 0x5E),
  Variant(fileName: "itqan-template-5-bronze.png", red: 0x9C, green: 0x76, blue: 0x2F),
  Variant(fileName: "itqan-template-5-navy.png", red: 0x2D, green: 0x4F, blue: 0x7C),
  Variant(fileName: "itqan-template-5-plum.png", red: 0x74, green: 0x4A, blue: 0x7A),
  Variant(fileName: "itqan-template-5-olive.png", red: 0x6E, green: 0x7E, blue: 0x38),
  Variant(fileName: "itqan-template-5-rosewood.png", red: 0x8A, green: 0x43, blue: 0x4A),
  Variant(fileName: "itqan-template-5-slate.png", red: 0x4E, green: 0x67, blue: 0x74),
  Variant(fileName: "itqan-template-5-turquoise.png", red: 0x2B, green: 0x9A, blue: 0xA0),
  Variant(fileName: "itqan-template-5-coral.png", red: 0xDD, green: 0x6B, blue: 0x55),
  Variant(fileName: "itqan-template-5-lavender.png", red: 0x8A, green: 0x6C, blue: 0xCF),
  Variant(fileName: "itqan-template-5-saffron.png", red: 0xD7, green: 0x9B, blue: 0x2F),
  Variant(fileName: "itqan-template-5-indigo.png", red: 0x4B, green: 0x5F, blue: 0xC7),
  Variant(fileName: "itqan-template-5-mint.png", red: 0x46, green: 0xA8, blue: 0x78),
  Variant(fileName: "itqan-template-5-charcoal.png", red: 0x49, green: 0x52, blue: 0x5C),
  Variant(fileName: "itqan-template-5-terracotta.png", red: 0xB7, green: 0x65, blue: 0x48),
  Variant(fileName: "itqan-template-5-petrol.png", red: 0x2F, green: 0x6F, blue: 0x7C),
  Variant(fileName: "itqan-template-5-mocha.png", red: 0x8A, green: 0x68, blue: 0x52),
  Variant(fileName: "itqan-template-5-ruby.png", red: 0xB6, green: 0x42, blue: 0x60),
  Variant(fileName: "itqan-template-5-peach.png", red: 0xDF, green: 0x94, blue: 0x6D),
  Variant(fileName: "itqan-template-5-lilac.png", red: 0x9D, green: 0x7A, blue: 0xC2),
  Variant(fileName: "itqan-template-5-forest.png", red: 0x2F, green: 0x6B, blue: 0x4F),
  Variant(fileName: "itqan-template-5-azure.png", red: 0x4F, green: 0x88, blue: 0xC6),
  Variant(fileName: "itqan-template-5-sand.png", red: 0xC4, green: 0xA1, blue: 0x61),
  Variant(fileName: "itqan-template-5-berry.png", red: 0xB1, green: 0x4D, blue: 0x74),
  Variant(fileName: "itqan-template-5-ocean.png", red: 0x3C, green: 0x7F, blue: 0x98),
  Variant(fileName: "itqan-template-5-steel.png", red: 0x70, green: 0x87, blue: 0x9C),
  Variant(fileName: "itqan-template-5-amber.png", red: 0xCF, green: 0x8A, blue: 0x2F),
]

let inputPath = "/Users/mohammedalrumhi/Documents/aldar-projects/cer/toDev/5.png"
let outputDir = "/Users/mohammedalrumhi/Documents/aldar-projects/cer/backend/uploads"

func loadBitmap(path: String) -> NSBitmapImageRep? {
  guard let image = NSImage(contentsOfFile: path) else { return nil }
  guard let data = image.tiffRepresentation else { return nil }
  return NSBitmapImageRep(data: data)
}

guard let source = loadBitmap(path: inputPath) else {
  fputs("Failed to load source image\n", stderr)
  exit(1)
}

guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB) else {
  fputs("Failed to create color space\n", stderr)
  exit(1)
}

let width = source.pixelsWide
let height = source.pixelsHigh
let bytesPerPixel = 4
let bytesPerRow = width * bytesPerPixel
let bitsPerComponent = 8

func isBlueAccent(r: UInt8, g: UInt8, b: UInt8, a: UInt8) -> Bool {
  if a < 20 { return false }
  let red = Double(r) / 255.0
  let green = Double(g) / 255.0
  let blue = Double(b) / 255.0
  let maxValue = max(red, green, blue)
  let minValue = min(red, green, blue)
  let delta = maxValue - minValue
  if delta < 0.08 { return false }
  let saturation = maxValue == 0 ? 0 : delta / maxValue
  if saturation < 0.22 { return false }

  var hue: Double = 0
  if delta != 0 {
    if maxValue == red {
      hue = ((green - blue) / delta).truncatingRemainder(dividingBy: 6)
    } else if maxValue == green {
      hue = ((blue - red) / delta) + 2
    } else {
      hue = ((red - green) / delta) + 4
    }
    hue *= 60
    if hue < 0 { hue += 360 }
  }

  return hue >= 165 && hue <= 220
}

for variant in variants {
  guard let context = CGContext(
    data: nil,
    width: width,
    height: height,
    bitsPerComponent: bitsPerComponent,
    bytesPerRow: bytesPerRow,
    space: colorSpace,
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
  ) else {
    fputs("Failed to create CGContext\n", stderr)
    exit(1)
  }

  guard let cgImage = source.cgImage else {
    fputs("Failed to read source cgImage\n", stderr)
    exit(1)
  }

  context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
  guard let data = context.data else {
    fputs("Missing bitmap data\n", stderr)
    exit(1)
  }

  let buffer = data.bindMemory(to: UInt8.self, capacity: width * height * bytesPerPixel)

  for index in stride(from: 0, to: width * height * bytesPerPixel, by: bytesPerPixel) {
    let r = buffer[index]
    let g = buffer[index + 1]
    let b = buffer[index + 2]
    let a = buffer[index + 3]

    if isBlueAccent(r: r, g: g, b: b, a: a) {
      let luminance = 0.299 * Double(r) + 0.587 * Double(g) + 0.114 * Double(b)
      let factor = max(0.55, min(1.25, luminance / 150.0))
      buffer[index] = UInt8(max(0, min(255, Double(variant.red) * factor)))
      buffer[index + 1] = UInt8(max(0, min(255, Double(variant.green) * factor)))
      buffer[index + 2] = UInt8(max(0, min(255, Double(variant.blue) * factor)))
    }
  }

  guard let output = context.makeImage() else {
    fputs("Failed to create recolored image\n", stderr)
    exit(1)
  }

  let rep = NSBitmapImageRep(cgImage: output)
  guard let pngData = rep.representation(using: .png, properties: [:]) else {
    fputs("Failed to encode png\n", stderr)
    exit(1)
  }

  let outputPath = URL(fileURLWithPath: outputDir).appendingPathComponent(variant.fileName)
  try pngData.write(to: outputPath)
  print(outputPath.path)
}