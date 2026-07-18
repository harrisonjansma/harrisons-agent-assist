# scripts

## og.html → public/og.png

Source for the 1200×630 OpenGraph card. Regenerate after editing copy:

```bash
chromium --headless --no-sandbox --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=1200,630 \
  --screenshot=../public/og.png og.html
```

(Any headless Chromium works; the page is self-contained, no network.)
