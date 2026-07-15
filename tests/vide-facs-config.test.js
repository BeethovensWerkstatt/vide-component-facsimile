import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VideFacs } from '../src/vide-facs.js'

if (!customElements.get('vide-facs')) {
  customElements.define('vide-facs', VideFacs)
}

describe('VideFacs configuration', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('passes api-base from the root element to the router', async () => {
    vi.useFakeTimers()

    const routerSpy = vi.fn().mockImplementation(function (app, config) {
      this.app = app
      this.config = config
    })

    window.VideFacsRouter = routerSpy

    const element = document.createElement('vide-facs')
    element.setAttribute('api-base', 'https://example.org/exist/apps/api/document')
    document.body.appendChild(element)

    await vi.runAllTimersAsync()

    expect(routerSpy).toHaveBeenCalledOnce()
    expect(routerSpy).toHaveBeenCalledWith(element, {
      apiBase: 'https://example.org/exist/apps/api/document'
    })

    vi.useRealTimers()
  })

  it('passes documents from the root element to the router', async () => {
    vi.useFakeTimers()

    const routerSpy = vi.fn().mockImplementation(function (app, config) {
      this.app = app
      this.config = config
    })

    window.VideFacsRouter = routerSpy

    const element = document.createElement('vide-facs')
    element.setAttribute('documents', '{"NK":"/custom/overview.json"}')
    document.body.appendChild(element)

    await vi.runAllTimersAsync()

    expect(routerSpy).toHaveBeenCalledOnce()
    expect(routerSpy).toHaveBeenCalledWith(element, {
      documents: {
        NK: '/custom/overview.json'
      }
    })

    vi.useRealTimers()
  })
})
