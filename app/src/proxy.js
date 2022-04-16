/*

The Parchment proxy
===================

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/iplayif.com

*/

import crypto from 'crypto'
import fetch from 'node-fetch'

import {BaseApp} from './app.js'
import * as templates from './templates.js'

const SUPPORTED_TYPES = /\.(blb|blorb|gam|gblorb|glb|hex|t3|ulx|zblorb|zlb|z[3458])$/i

export default class ProxyApp extends BaseApp {
    async proxy(ctx) {
        ctx.component_name = 'Parchment Proxy'
        const query = ctx.query
        const url = query.url

        if (!url) {
            ctx.body = templates.wrapper({
                content: templates.proxyhome(),
                title: 'Parchment Proxy',
            })
            return
        }

        ctx.type = 'text/plain; charset=ISO-8859-1'

        if (!SUPPORTED_TYPES.test(url)) {
            ctx.throw(400, 'Unsupported file type')
        }

        // Request the URL
        const response = await fetch(url, {redirect: 'follow'})
        if (!response.ok) {
            throw new Error(`Cannot access ${url}: ${response.status}, ${response.statusText}`)
        }

        const buffer = Buffer.from(await response.arrayBuffer())
        if (buffer.length > this.options.proxy.max_size) {
            ctx.throw(400, 'Requested file too large')
        }

        const data = buffer.toString(query.encode === 'base64' ? 'base64' : 'latin1')
        if (query.callback) {
            ctx.type = 'text/javascript'
            ctx.body = `${query.callback}("${data}")`
        }
        else {
            ctx.body = data
        }

        // Set and check ETag
        ctx.response.etag = crypto.createHash('md5').update(ctx.body).digest('hex')
        if (ctx.fresh) {
            ctx.status = 304
            return
        }
    }
}