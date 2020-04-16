# Stremio Add-on to Add an IMDB Tag  as a Catalog

This is a simple add-on that uses an ajax call to get a list of items based on tag from IMDB, then converts those items to Stremio supported Meta Objects.


## Using locally

**Pre-requisites: Node.js, Git**

```
git clone https://github.com/jaruba/stremio-imdb-tag.git
cd stremio-imdb-list
npm i
npm start
```

This will print `http://127.0.0.1:7525/[imdb-tag]/manifest.json`. Add a IMDB list id instead of `[imdb-tag]` in this URL and [load the add-on in Stremio](https://github.com/jaruba/stremio-imdb-tag#6-install-add-on-in-stremio).


## Using remotely

Use `https://imdb-tag.baby-supernode.xyz/[imdb-tag]/manifest.json`. Add a IMDB list id instead of `[imdb-list-id]` in this URL and [load the add-on in Stremio](https://github.com/jaruba/stremio-imdb-tag#install-add-on-in-stremio).


## What is a IMDB Tag ID

Presuming that the list for the keyword you want to add is `https://www.imdb.com/search/keyword?keywords=action-hero`, the IMDB tag id in this case is `action-hero`.

You can search through all the IMDB tags on [this page](https://imdb.to/2H0PGVs).


## Sorting Tag Lists

You can also sort these lists, supported sorting tags: `popular`, `new`, `rating`, `alphabetical`, `votes`, `longest`, `shortest`, `yearDesc`, `yearAsc`

The default sorting is: `popular`

To get a list of sorted items, use: `https://imdb-tag.baby-supernode.xyz/[imdb-tag]/[sorting-tag]/manifest.json`

Example: `https://imdb-tag.baby-supernode.xyz/action-hero/new/manifest.json`


### Install Add-on in Stremio

![addlink](https://user-images.githubusercontent.com/1777923/43146711-65a33ccc-8f6a-11e8-978e-4c69640e63e3.png)
