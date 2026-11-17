# Draws assets/logo-source.png (1024 x 1024) from the shapes of assets/logo-source.svg
# (pink 3D L with speed lines on a black rounded square), then build/make-icons.ps1
# turns it into icon.png and icon.ico.
# Run:  powershell -NoProfile -ExecutionPolicy Bypass -File build/draw-logo.ps1
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$N = 1024; $k = $N / 120.0

function Col([string]$hex, [int]$a = 255) {
  $h = $hex.TrimStart('#')
  [System.Drawing.Color]::FromArgb($a, [Convert]::ToInt32($h.Substring(0,2),16), [Convert]::ToInt32($h.Substring(2,2),16), [Convert]::ToInt32($h.Substring(4,2),16))
}
function Pts([double[]]$xy) {
  $p = for ($i = 0; $i -lt $xy.Count; $i += 2) { New-Object System.Drawing.PointF ([single]($xy[$i] * $k)), ([single]($xy[$i+1] * $k)) }
  ,[System.Drawing.PointF[]]$p
}

$bmp = New-Object System.Drawing.Bitmap $N, $N, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)

# black rounded square (rx 26)
$r = 26 * $k * 2
$bg = New-Object System.Drawing.Drawing2D.GraphicsPath
$bg.AddArc(0, 0, $r, $r, 180, 90); $bg.AddArc($N - $r, 0, $r, $r, 270, 90)
$bg.AddArc($N - $r, $N - $r, $r, $r, 0, 90); $bg.AddArc(0, $N - $r, $r, $r, 90, 90); $bg.CloseFigure()
$g.FillPath((New-Object System.Drawing.SolidBrush (Col '#000000')), $bg)

# speed lines (pink, 50 %)
$pen = New-Object System.Drawing.Pen (Col '#ff5fbf' 128), ([single](4 * $k))
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round; $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
foreach ($l in @(@(12,52,28,52), @(8,62,28,62), @(14,72,28,72))) {
  $g.DrawLine($pen, [single]($l[0]*$k), [single]($l[1]*$k), [single]($l[2]*$k), [single]($l[3]*$k))
}

# 3D L
$faces = @(
  @('#ff9ad6', @(40,32, 48,24, 64,24, 56,32)),
  @('#b8357f', @(56,32, 64,24, 64,68, 56,76)),
  @('#ff9ad6', @(56,76, 64,68, 92,68, 84,76)),
  @('#b8357f', @(84,76, 92,68, 92,84, 84,92)),
  @('#ff5fbf', @(40,32, 56,32, 56,76, 84,76, 84,92, 40,92))
)
foreach ($f in $faces) { $g.FillPolygon((New-Object System.Drawing.SolidBrush (Col $f[0])), (Pts $f[1])) }

$g.Dispose()
$bmp.Save((Join-Path $root 'assets\logo-source.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "assets\logo-source.png ($N x $N) OK."
& (Join-Path $PSScriptRoot 'make-icons.ps1')
