# Converts the carousel PNGs to JPEG — the Instagram Content Publishing API
# only accepts JPEG for image posts.

Add-Type -AssemblyName System.Drawing

$src = Join-Path $PSScriptRoot 'posts'
$dst = Join-Path $PSScriptRoot 'posts-jpg'

if (-not (Test-Path $dst)) { New-Item -ItemType Directory -Path $dst | Out-Null }

# 92% quality — high enough that Instagram's own recompression is the
# limiting factor, not ours.
$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = New-Object System.Drawing.Imaging.EncoderParameters(1)
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality, 92L)

Get-ChildItem -Path $src -Filter '*.png' | ForEach-Object {
    $img = [System.Drawing.Image]::FromFile($_.FullName)

    # Flatten onto black so any transparency matches the design.
    $flat = New-Object System.Drawing.Bitmap($img.Width, $img.Height)
    $g = [System.Drawing.Graphics]::FromImage($flat)
    $g.Clear([System.Drawing.Color]::FromArgb(8, 8, 10))
    $g.DrawImage($img, 0, 0, $img.Width, $img.Height)

    $out = Join-Path $dst ($_.BaseName + '.jpg')
    $flat.Save($out, $encoder, $params)

    $g.Dispose(); $flat.Dispose(); $img.Dispose()
    Write-Host "$($_.BaseName).jpg"
}

Write-Host "`nDone -> $dst"
