import Layer from 'express/lib/router/layer.js'

// Express 4 ne rattrape pas les promesses rejetées des gestionnaires `async` : une requête Mongo qui
// échoue (base injoignable, DNS « EAI_AGAIN »…) dans une route sans try/catch devenait une
// « promesse rejetée sans traitement » et la requête restait sans réponse. On transmet désormais
// l'erreur à `next(err)` (voir `apiErrorHandler`). À installer avant la déclaration des routes.
let installed = false
export const installAsyncRouteSafety = () => {
  if (installed) return
  installed = true
  const original = Layer.prototype.handle_request
  Layer.prototype.handle_request = function handleRequest(req, res, next) {
    const fn = this.handle
    if (fn.length > 3) return next()
    try {
      const result = fn(req, res, next)
      if (result && typeof result.catch === 'function') result.catch(next)
    } catch (err) {
      next(err)
    }
  }
  Layer.prototype.handle_request.original = original
}

const isDatabaseError = (err) => {
  const name = err?.name || ''
  return /^Mongo(?:Server)?(?:Selection|Network|NotConnected|Topology|PoolCleared|ServerSelection)/.test(name) ||
    name === 'MongooseServerSelectionError' ||
    /EAI_AGAIN|ECONNREFUSED|Server selection timed out|Connection pool .* was cleared|Topology is closed/i.test(err?.message || '')
}

// Dernier middleware : réponse JSON propre (503 si la base est injoignable, 500 sinon)
// eslint-disable-next-line no-unused-vars
export const apiErrorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err)
  const database = isDatabaseError(err)
  console.error(`[Http] ${req.method} ${String(req.originalUrl).split('?')[0]} : ${database ? 'base de données injoignable' : 'erreur imprévue'} — ${err?.message}`)
  if (database) return res.status(503).json({ error: req.t('errors.databaseUnavailable') })
  return res.status(500).json({ error: req.t('errors.internal') })
}
