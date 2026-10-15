<#
.SYNOPSIS
  Publishes the Covanreach carousels to Instagram via the Meta Content
  Publishing API.

.DESCRIPTION
  Instagram's API cannot accept a file upload. It fetches images from public
  URLs, so the JPEGs must already be reachable on the internet (GitHub Pages
  works — see SETUP-INSTAGRAM.md).

  Publishing a carousel is three calls:
    1. one container per slide  (is_carousel_item=true)
    2. one parent container     (media_type=CAROUSEL, children=...)
    3. publish the parent

.PARAMETER Post
  Which carousel to publish: 1, 2 or 3.

.PARAMETER DryRun
  Build and validate everything, but stop before the final publish call.

.EXAMPLE
  .\publish-instagram.ps1 -Post 3 -DryRun
  .\publish-instagram.ps1 -Post 3
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet(1, 2, 3)]
    [int]$Post,

    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$API = 'https://graph.facebook.com/v21.0'

# ---------------------------------------------------------------------------
# Config — set these as environment variables, don't hard-code them here.
#   $env:IG_USER_ID      = '17841400000000000'
#   $env:IG_ACCESS_TOKEN = 'EAAG...'
#   $env:IG_IMAGE_BASE   = 'https://scale-covan.github.io/Covanreach-Media/social/posts-jpg'
# ---------------------------------------------------------------------------
$igUserId    = $env:IG_USER_ID
$accessToken = $env:IG_ACCESS_TOKEN
$imageBase   = $env:IG_IMAGE_BASE

foreach ($pair in @(
    @{ Name = 'IG_USER_ID';      Value = $igUserId },
    @{ Name = 'IG_ACCESS_TOKEN'; Value = $accessToken },
    @{ Name = 'IG_IMAGE_BASE';   Value = $imageBase })) {
    if ([string]::IsNullOrWhiteSpace($pair.Value)) {
        throw "Environment variable $($pair.Name) is not set. See SETUP-INSTAGRAM.md."
    }
}

$imageBase = $imageBase.TrimEnd('/')

# ---------------------------------------------------------------------------
# Captions
# ---------------------------------------------------------------------------
$captions = @{
    1 = @'
The cons list is still blank. We checked twice.

Here's what actually changes when you hand your socials off:

Customers who found you online instead of by accident.
A slow season that's less slow.
No hire, no payroll, no training somebody's nephew.
Your nights back.

You run a business. Marketing shouldn't be the thing you do after closing.

Flat monthly rate. Rates are on the site, no quote that takes a week.

Clarksville / Nashville / Middle TN

.
.
#clarksvilletn #clarksvilletennessee #middletennessee #clarksvillebusiness #smallbusinessowner #shopsmall #localbusiness #montgomerycountytn #nashvillesmallbusiness #tennesseebusiness #smallbusinessmarketing #socialmediamanagement #businessowner
'@

    2 = @'
You almost swiped past this one. Your customers do that to you every day.

Three seconds is what your business gets before the thumb keeps moving. That's not a you problem, it's a first-frame problem. Bad light, opens with a logo, posted whenever there was a free minute between customers.

Same shop, different three seconds, completely different month.

We shoot it on real gear, on location, and it goes out 3-4x a week whether anybody remembers or not. You get back to running the place.

Clarksville / Nashville / Middle TN

.
.
#clarksvilletn #middletennessee #clarksvillesmallbusiness #smallbusinessowner #localbusiness #shoplocal #businessowner #nashvillebusiness #montgomerycountytn #smallbusinesstips #videomarketing #reels #tennesseesmallbusiness
'@

    3 = @'
The shop down the road isn't better than you. They're just louder.

Same service, same town, same price range - they just show up on the screen more often than you do.

Here's what "I'll just post it myself" actually costs in a week:
Filming - 2 hrs
Editing - 3 hrs
Captions - 1 hr
Posting and replies - 2 hrs

Eight hours. Every week. On top of running the business.

Hand us all eight. We show up and shoot, we cut it into reels, we post and reply. You run the business.

Clarksville / Nashville / Middle TN

.
.
#clarksvilletn #clarksvillebusiness #middletennessee #smallbusinessowner #localbusiness #businessowner #shopsmall #montgomerycountytn #nashvillebusiness #smallbusinessgrowth #marketingagency #tennesseebusiness #socialmediamanager
'@
}

$slideUrls = 1..5 | ForEach-Object { "$imageBase/post$Post-slide$_.jpg" }
$caption   = $captions[$Post]

Write-Host "Publishing carousel $Post ($($slideUrls.Count) slides)" -ForegroundColor Cyan

# ---------------------------------------------------------------------------
# Preflight: confirm every image is publicly reachable before touching the API.
# ---------------------------------------------------------------------------
Write-Host "`nChecking images are public..." -ForegroundColor Cyan
foreach ($url in $slideUrls) {
    try {
        $r = Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing -TimeoutSec 20
        $type = $r.Headers['Content-Type']
        if ($type -notlike 'image/jpeg*') {
            throw "$url returned Content-Type '$type' (must be image/jpeg)"
        }
        Write-Host "  ok  $url"
    } catch {
        throw "Cannot reach $url - Instagram must be able to download it. $_"
    }
}

# ---------------------------------------------------------------------------
# Step 1 — one container per slide
# ---------------------------------------------------------------------------
Write-Host "`nCreating slide containers..." -ForegroundColor Cyan
$childIds = @()
foreach ($url in $slideUrls) {
    $body = @{
        image_url        = $url
        is_carousel_item = 'true'
        access_token     = $accessToken
    }
    $res = Invoke-RestMethod -Uri "$API/$igUserId/media" -Method Post -Body $body
    $childIds += $res.id
    Write-Host "  container $($res.id)"
}

# ---------------------------------------------------------------------------
# Step 2 — parent carousel container
# ---------------------------------------------------------------------------
Write-Host "`nCreating carousel container..." -ForegroundColor Cyan
$parentBody = @{
    media_type   = 'CAROUSEL'
    children     = ($childIds -join ',')
    caption      = $caption
    access_token = $accessToken
}
$parent = Invoke-RestMethod -Uri "$API/$igUserId/media" -Method Post -Body $parentBody
Write-Host "  parent $($parent.id)"

# Meta needs a moment to finish pulling the images.
Write-Host "`nWaiting for container to finish..." -ForegroundColor Cyan
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 3
    $status = Invoke-RestMethod -Method Get `
        -Uri "$API/$($parent.id)?fields=status_code,status&access_token=$accessToken"
    Write-Host "  $($status.status_code)"
    if ($status.status_code -eq 'FINISHED') { break }
    if ($status.status_code -eq 'ERROR')    { throw "Container failed: $($status.status)" }
}

if ($DryRun) {
    Write-Host "`nDRY RUN - stopping before publish." -ForegroundColor Yellow
    Write-Host "Container $($parent.id) is ready. Re-run without -DryRun to post it."
    return
}

# ---------------------------------------------------------------------------
# Step 3 — publish
# ---------------------------------------------------------------------------
Write-Host "`nPublishing..." -ForegroundColor Cyan
$published = Invoke-RestMethod -Uri "$API/$igUserId/media_publish" -Method Post -Body @{
    creation_id  = $parent.id
    access_token = $accessToken
}

Write-Host "`nLive. Media ID $($published.id)" -ForegroundColor Green
Write-Host "Pinning has to be done by hand in the app - the API can't pin."
