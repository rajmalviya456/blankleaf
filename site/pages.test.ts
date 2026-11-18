import { describe, expect, it } from 'vitest'
import { HOME_URL, PAGES, renderPage, renderSitemap } from './pages.ts'

const rendered = PAGES.map((page) => ({ page, html: renderPage(page) }))
const attr = (html: string, re: RegExp) => re.exec(html)?.[1]

describe('search landing pages', () => {
  it('have unique, search-friendly titles and descriptions', () => {
    for (const { title, description } of PAGES) {
      expect(title.length, title).toBeLessThanOrEqual(60)
      expect(description.length, description).toBeGreaterThanOrEqual(70)
      expect(description.length, description).toBeLessThanOrEqual(160)
    }
    expect(new Set(PAGES.map((p) => p.title)).size).toBe(PAGES.length)
    expect(new Set(PAGES.map((p) => p.description)).size).toBe(PAGES.length)
    expect(new Set(PAGES.map((p) => p.slug)).size).toBe(PAGES.length)
  })

  it.each(rendered.map((r) => [r.page.slug, r.html]))('%s is a complete page', (slug, html) => {
    const url = `${HOME_URL}${slug}/`
    expect(html).toMatch(/^<!doctype html>/)
    expect(html).toContain('<html lang="en">')
    expect(html.match(/<h1[ >]/g)).toHaveLength(1)
    expect(attr(html, /<link rel="canonical" href="([^"]+)"/)).toBe(url)
    expect(attr(html, /<meta property="og:url" content="([^"]+)"/)).toBe(url)
    expect(html).toContain('name="viewport"')
    expect(html).toContain('summary_large_image')
    expect(html).toContain('href="/blankleaf/">Open Blankleaf')
  })

  it('carry valid structured data', () => {
    for (const { page, html } of rendered) {
      const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.+?)<\/script>/gs)]
      expect(blocks.length, page.slug).toBeGreaterThan(0)
      for (const b of blocks) expect(() => JSON.parse(b[1])).not.toThrow()
    }
  })

  it('the FAQ schema matches the questions on the page', () => {
    const faq = rendered.find((r) => r.page.slug === 'faq')!
    const json =
      /<script type="application\/ld\+json">(\{"@context":"https:\/\/schema.org","@type":"FAQPage".+?)<\/script>/s.exec(
        faq.html,
      )
    const data = JSON.parse(json![1])
    expect(data.mainEntity.map((q: { name: string }) => q.name)).toEqual(
      faq.page.faq!.map((q) => q.q),
    )
    expect(faq.page.faq!.length).toBeGreaterThanOrEqual(8)
  })

  it('only link to pages that exist', () => {
    const known = new Set(['/blankleaf/', ...PAGES.map((p) => `/blankleaf/${p.slug}/`)])
    for (const { html } of rendered)
      for (const [, href] of html.matchAll(/<a [^>]*href="(\/blankleaf\/[^"]*)"/g))
        expect(known, href).toContain(href)
  })

  it('escape text safely', () => {
    const html = renderPage({ ...PAGES[0], intro: 'a <b> & "c"' })
    expect(html).toContain('a &lt;b&gt; &amp; &quot;c&quot;')
  })
})

describe('sitemap', () => {
  it('lists the app and every page', () => {
    const xml = renderSitemap()
    expect(xml).toContain(`<loc>${HOME_URL}</loc>`)
    for (const p of PAGES) expect(xml).toContain(`<loc>${HOME_URL}${p.slug}/</loc>`)
  })
})
