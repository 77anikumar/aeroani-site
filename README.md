# AeroAni

Source for [aeroani.com](https://aeroani.com): Ani Kumar's aviation photography and aerospace engineering portfolio.

It's a plain static site with no framework. A small Node script stitches the pages together, and GitHub Actions publishes it to GitHub Pages on every push to `main`.

## Where things live

| To change… | Edit |
| --- | --- |
| Home, About, Engineering, Contact text | `src/pages/*.html` |
| Header, footer, fonts | `src/layout.html` |
| Colors, spacing, layout | `assets/css/site.css` |
| Photos, locations, hero image, "Selected shots" | `data/photos.json` |
| Photo viewer, mobile menu | `assets/js/site.js` |

Location pages and the Photography index are generated from `data/photos.json`. To add a location, add an entry there and its pages appear automatically.

## Preview locally

```sh
node scripts/build.mjs
npx serve _site        # or: cd _site && python3 -m http.server
```

## Photos

While `"selfHosted": false` in `data/photos.json`, photos load from the old Squarespace CDN. To copy them into this repo once, go to the **Actions** tab and run **Copy photos into repo**. It downloads every photo into `images/`, flips `selfHosted` to `true`, commits, and redeploys. After that the site no longer depends on Squarespace.

New photos: put `NAME.jpg` (about 2500px) and `NAME-thumb.jpg` (about 750px) in `images/<location>/`, then add the path to that location's `photos` list.

## Domain

`CNAME` tells GitHub Pages to serve the site at `aeroani.com`. The domain is registered at Squarespace, and its DNS points at GitHub Pages:

| Type | Host | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | `<github-username>.github.io` |
