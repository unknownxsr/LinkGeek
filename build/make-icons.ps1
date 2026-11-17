# Generates the Linkgeek icons from assets/logo-source.png:
#   assets/icon.png  512 x 512 (window, notifications, tray, interface)
#   assets/icon.ico  16, 24, 32, 48, 64, 128, 256 (exe, installer, uninstaller, shortcuts)
# The ICO stores 16 to 128 as 32-bit bitmaps (read by every Windows tool, NSIS included)
# and 256 as PNG (the standard for that size).
# Run:  powershell -NoProfile -ExecutionPolicy Bypass -File build/make-icons.ps1
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$src = Join-Path $root 'assets\logo-source.png'
if (-not (Test-Path $src)) { throw "Logo introuvable : $src" }

function Resize([System.Drawing.Image]$img, [int]$size) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $attr = New-Object System.Drawing.Imaging.ImageAttributes
  $attr.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY) # no dark fringe on the edges
  $g.DrawImage($img, (New-Object System.Drawing.Rectangle 0, 0, $size, $size), 0, 0, $img.Width, $img.Height, [System.Drawing.GraphicsUnit]::Pixel, $attr)
  $g.Dispose()
  return $bmp
}

function PngBytes([System.Drawing.Bitmap]$bmp) {
  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  return ,[byte[]]$ms.ToArray()   # the comma keeps it one byte[] (PowerShell would unroll it)
}

# 32-bit DIB for an ICO entry: BITMAPINFOHEADER + BGRA pixels bottom-up + empty AND mask
function DibBytes([System.Drawing.Bitmap]$bmp) {
  $w = $bmp.Width; $h = $bmp.Height
  $ms = New-Object System.IO.MemoryStream
  $bw = New-Object System.IO.BinaryWriter $ms
  $bw.Write([int]40); $bw.Write([int]$w); $bw.Write([int]($h * 2)); $bw.Write([int16]1); $bw.Write([int16]32)
  $bw.Write([int]0); $bw.Write([int]0); $bw.Write([int]0); $bw.Write([int]0); $bw.Write([int]0); $bw.Write([int]0)
  $rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
  $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $row = New-Object byte[] ($w * 4)
  for ($y = $h - 1; $y -ge 0; $y--) {
    [System.Runtime.InteropServices.Marshal]::Copy([IntPtr]($data.Scan0.ToInt64() + $y * $data.Stride), $row, 0, $w * 4)
    $bw.Write($row)
  }
  $bmp.UnlockBits($data)
  $maskRow = [int]([math]::Ceiling($w / 32.0) * 4)
  $bw.Write((New-Object byte[] ($maskRow * $h)))
  $bw.Flush()
  return ,[byte[]]$ms.ToArray()
}

$img = [System.Drawing.Image]::FromFile($src)
try {
  # icon.png 512 x 512
  $big = Resize $img 512
  [IO.File]::WriteAllBytes((Join-Path $root 'assets\icon.png'), (PngBytes $big))
  $big.Dispose()

  # icon.ico, multi-size
  $sizes = 16, 24, 32, 48, 64, 128, 256
  $frames = foreach ($s in $sizes) {
    $b = Resize $img $s
    $bytes = if ($s -ge 256) { PngBytes $b } else { DibBytes $b }
    $b.Dispose()
    [pscustomobject]@{ Size = $s; Bytes = [byte[]]$bytes }
  }
  $ms = New-Object System.IO.MemoryStream
  $bw = New-Object System.IO.BinaryWriter $ms
  $bw.Write([int16]0); $bw.Write([int16]1); $bw.Write([int16]$frames.Count)   # ICONDIR
  $offset = 6 + 16 * $frames.Count
  foreach ($f in $frames) {                                                     # ICONDIRENTRY
    $dim = if ($f.Size -ge 256) { 0 } else { $f.Size }
    $bw.Write([byte]$dim); $bw.Write([byte]$dim); $bw.Write([byte]0); $bw.Write([byte]0)
    $bw.Write([int16]1); $bw.Write([int16]32); $bw.Write([int]$f.Bytes.Length); $bw.Write([int]$offset)
    $offset += $f.Bytes.Length
  }
  foreach ($f in $frames) { $bw.Write($f.Bytes) }
  $bw.Flush()
  [IO.File]::WriteAllBytes((Join-Path $root 'assets\icon.ico'), $ms.ToArray())
  Write-Host "assets\icon.png (512) et assets\icon.ico ($($sizes -join ', ')) générés."
} finally { $img.Dispose() }
