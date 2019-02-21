
const express = require('express')
const app = express()
const cors = require('cors')

const helpers = require('./helpers')
const cheerio = require('cheerio')

app.use(cors())

const manifest = {
	id: 'org.imdbtag',
	version: '0.0.1',
	name: 'IMDB Tag Add-on',
	description: 'Add-on to create a catalog from a IMDB tag.',
	resources: ['catalog'],
	types: ['movie', 'series'],
	catalogs: [
		{
			id: 'imdb-movie-tag',
			name: 'IMDB Movie Tag List',
			type: 'movie'
		}, {
			id: 'imdb-series-tag',
			name: 'IMDB Series Tag List',
			type: 'series'
		}
	]
}

app.get('/:tagId/:sort?/manifest.json', (req, res) => {
	const cacheTag = helpers.simplerText(req.params.tagId) + '[]' + (req.params.sort || 'popular')
	const cloneManifest = JSON.parse(JSON.stringify(manifest))
	cloneManifest.id += cacheTag
	cloneManifest.name = helpers.toTitleCase(req.params.tagId) + ' ' + helpers.sortsTitleMap[req.params.sort || 'popular']
	cloneManifest.catalogs.forEach((cat, ij) => {
		cloneManifest.catalogs[ij].id += '-'+cacheTag
		cloneManifest.catalogs[ij].name = helpers.toTitleCase(req.params.tagId) + ' ' + (cat.type == 'movie' ? 'Movies' : 'Series') + ' ' + helpers.sortsTitleMap[req.params.sort || 'popular']
	})
	res.setHeader('Cache-Control', 'max-age=604800') // one week
	res.setHeader('Content-Type', 'application/json')
	res.send(cloneManifest)
})

const needle = require('needle')

const headers = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
	'Accept-Language': 'en-US,en;q=0.8',
}

const sortsMap = {
	'popular': 'moviemeter,asc',
	'new': 'release_date,desc',
	'rating': 'user_rating,desc',
	'alphabetical': 'alpha,asc',
	'votes': 'num_votes,desc',
	'longest': 'runtime,desc',
	'shortest': 'runtime,asc',
	'yearDesc': 'year,desc',
	'yearAsc': 'year,asc'
}

function parseHeaderData(header) {
    if (header) {

        var link = header.find('a')

        if (link && link.length) {
            var name = helpers.toString(link)
            var href = link.attr('href')
        }

        var year = helpers.toString(header.find('span').eq(1))

        var type = helpers.toType(year)

        year = helpers.toYear(year)

        var imdbId = href ? helpers.imdb.toId(href) : false

        return { id: imdbId, name, year, type }

    } else {
        return {}
    }
}

function getList(tagId, sort, page, cb) {
	if (tagId) {
		headers.referer = 'https://www.imdb.com/search/keyword?keywords='+tagId
		const getUrl = 'https://www.imdb.com/search/keyword/_ajax?keywords='+tagId+'&sort='+helpers.imdb.sorts[sort]+'&mode=detail&page=' + page
		needle.get(getUrl, { headers }, (err, resp) => {
			if (!err && resp && resp.body) {

				const results = { movie: [], series: [] }

				const cacheTag = helpers.simplerText(tagId) + '[]' + sort

				if (page == 1) {
					cache[cacheTag] = { movie: [], series: [] }
				}

				const $ = cheerio.load(resp.body)

				$('.lister-item').each((ij, el) => {

					var resp = parseHeaderData($(el).find('.lister-item-header'))

					var imgElm = $(el).find('img')

					resp.poster = imgElm && imgElm.length ? helpers.imageResize(imgElm.attr('loadlate'), 250) : false

					var isReleased = !$(el).find('.lister-item-content').find('p.text-muted.text-small').eq(0).has('b').length

					// we only add items that have already been released
					if (isReleased && resp.type && results[resp.type])
						results[resp.type].push(resp)

				})

				if (results.movie.length || results.series.length) {
					cache[cacheTag].movie = cache[cacheTag].movie.concat(results.movie)
					cache[cacheTag].series = cache[cacheTag].series.concat(results.series)
					// parse only 2 pages
					if (page < 2) {
						page++
						getList(tagId, sort, page, cb)
						return
					}
				}
				if (cache[cacheTag].movie.length || cache[cacheTag].series.length) {
					// remove cache weekly
					setTimeout(() => {
						manifest.types.forEach(el => { delete cache[cacheTag] })
					}, 604800000)
					cb(false, true)
				} else
					cb('No results for this tag')
			} else
				cb(err || 'Error on requesting ajax call')
		})
	} else
		cb('No list id')
}

const namedQueue = require('named-queue')

const queue = new namedQueue((task, cb) => {
	const id = task.id.split('[]')[0]
	const sort = task.id.split('[]')[1]
	getList(id, sort, 1, cb)
}, Infinity)

const cache = { movie: {}, series: {} }

app.get('/:tagId/:sort?/catalog/:type/:id.json', (req, res) => {
	const cacheTag = helpers.simplerText(req.params.tagId) + '[]' + (req.params.sort || 'popular')
	function fail(err) {
		console.error(err)
		res.writeHead(500)
		res.end(JSON.stringify({ err: 'handler error' }))
	}
	function respond(msg) {
		res.setHeader('Cache-Control', 'max-age=604800') // one week
		res.setHeader('Content-Type', 'application/json')
		res.send(msg)
	}
	function fetch() {
		queue.push({ id: req.params.tagId + '[]' + (req.params.sort || 'popular') }, (err, done) => {
			if (done) {
				const userData = cache[cacheTag][req.params.type]
				respond(JSON.stringify({ metas: userData }))
			} else 
				fail(err || 'Could not get list items')
		})
	}
	if (req.params.tagId && ['movie','series'].indexOf(req.params.type) > -1) {
		if (cache[cacheTag] && cache[cacheTag][req.params.type]) {
			const userData = cache[cacheTag][req.params.type]
			if (userData.length)
				respond(JSON.stringify({ metas: userData }))
			else
				fetch()
		} else
			fetch()
	} else
		fail('Unknown request parameters')
})

module.exports = app
