# Auto-posting to Instagram

Two ways to do this. Pick based on whether you want to press a button or
never think about it again.

---

## Option A — Meta Business Suite (free, ~5 minutes, no code)

Best if you're posting these three once and pinning them.

1. Go to [business.facebook.com](https://business.facebook.com) and connect
   your Instagram account.
2. **Create post → Instagram feed → Add photos.**
3. Upload the five JPEGs from `social/posts-jpg/` in order
   (`post3-slide1.jpg` … `post3-slide5.jpg`).
4. Paste the caption from `CAPTIONS.md`.
5. Publish, or schedule it.

It supports carousels and scheduling, it's official, and it costs nothing.
For three posts this is genuinely the right answer.

**Limitation:** you still click the button each time. It doesn't run itself.

---

## Option B — Content Publishing API (real automation, ~45 min setup)

Worth it if you'll be posting on a recurring schedule, or eventually posting
on behalf of clients.

### What Instagram requires

- An Instagram **Professional** account (Business or Creator — not personal)
- A **Facebook Page** connected to it
- A **Meta developer app**
- Images at **public URLs**. The API will not accept a file upload — it
  downloads the image from a URL you give it, so the JPEGs have to be on the
  internet already.
- **JPEG only.** PNG is rejected. `convert-to-jpg.ps1` already handled this;
  the converted files are in `social/posts-jpg/`.

### 1. Switch the account to Professional

Instagram app → Settings → Account type → **Switch to professional account**.
Connect it to a Facebook Page when prompted (make one if you don't have one).

### 2. Create the Meta app

1. [developers.facebook.com/apps](https://developers.facebook.com/apps) →
   **Create App** → type **Business**.
2. Add the **Instagram Graph API** product.
3. Under **App Roles**, make sure your account is an admin.

### 3. Get a token and your IG user ID

1. Open [Graph API Explorer](https://developers.facebook.com/tools/explorer/).
2. Select your app.
3. Add these permissions:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`
4. **Generate Access Token**, approve the dialog.
5. Find your Instagram user ID — run this in the Explorer:
   ```
   me/accounts?fields=instagram_business_account{id,username}
   ```
   The `id` under `instagram_business_account` is your `IG_USER_ID`.

The token from the Explorer expires in about an hour. To get a long-lived one
(~60 days):

```
GET https://graph.facebook.com/v21.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id=YOUR_APP_ID
  &client_secret=YOUR_APP_SECRET
  &fb_exchange_token=SHORT_LIVED_TOKEN
```

### 4. Host the images publicly

Your repo can do this for free with GitHub Pages:

1. [github.com/Scale-Covan/Covanreach-Media](https://github.com/Scale-Covan/Covanreach-Media)
   → **Settings → Pages**
2. Source: **Deploy from a branch**, branch `main`, folder `/ (root)`, Save.
3. Wait ~2 minutes. Your images are then at:
   ```
   https://scale-covan.github.io/Covanreach-Media/social/posts-jpg/post3-slide1.jpg
   ```

⚠️ **This makes the whole repo public if it isn't already.** Your repo is
currently private. GitHub Pages on a private repo needs a paid plan — so
either flip the repo to public (there's nothing secret in it: it's a marketing
site, and the Formspree endpoint is meant to be client-side), or host the
JPEGs somewhere else (Cloudinary and imgur both have free tiers).

### 5. Set your environment variables

```powershell
$env:IG_USER_ID      = '17841400000000000'
$env:IG_ACCESS_TOKEN = 'EAAG...'
$env:IG_IMAGE_BASE   = 'https://scale-covan.github.io/Covanreach-Media/social/posts-jpg'
```

To persist them across reboots, use `[Environment]::SetEnvironmentVariable(...)`
with the `'User'` scope instead.

**Never commit the token.** It's account access in a string.

### 6. Test, then publish

```powershell
.\social\publish-instagram.ps1 -Post 3 -DryRun
```

That builds the carousel and stops before posting. If it reports `FINISHED`,
drop the flag:

```powershell
.\social\publish-instagram.ps1 -Post 3
```

---

## Things worth knowing

- **The API can't pin posts.** Pinning is app-only — publish, then pin the
  three by hand. One-time job.
- **25 posts per 24 hours** per account.
- **Carousels max at 10 slides.** You're at 5.
- **Tokens expire (~60 days).** A scheduled job will silently stop working
  when it lapses, so put a calendar reminder to refresh it.
- **First publish often fails** on a permissions or account-type detail. The
  script's error message passes Meta's response straight through, which is
  usually specific enough to act on.

## Fully hands-off

Once the manual run works, wrap it in Task Scheduler:

```powershell
$action  = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument '-File "C:\Users\sheac\covanreach website\social\publish-instagram.ps1" -Post 3'
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Tuesday -At 10am
Register-ScheduledTask -TaskName 'IG Post' -Action $action -Trigger $trigger
```

Note that a scheduled task runs in its own session and won't see environment
variables you set interactively — set them at `'Machine'` or `'User'` scope
first.
