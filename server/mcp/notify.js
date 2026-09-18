// Notification simplifiée pour les écritures MCP : réutilise dispatchFamilyAlert (donc le journal
// d'alertes Super Admin) mais avec un contenu générique plutôt que les templates HTML riches des
// routes HTTP, pour éviter de dupliquer ~50 lignes de HTML par action pour chacun des ~15 outils
// d'écriture. L'acteur est le créateur du connecteur (audit) quand aucun membre n'est explicitement
// résolu par l'outil.
export const notifyMcpAction = (req, ctx, { action, title, targetType, targetId, body, actor }) => {
  const { dispatchFamilyAlert } = ctx
  dispatchFamilyAlert({
    family: req.family,
    actor: actor || req.mcpFallbackActor || null,
    action: action.code,
    actionLabel: action.label,
    title,
    targetType,
    targetId,
    push: { title, body, url: `/${req.family.slug}/dashboard` },
    email: null
  }).catch(err => console.error('[MCP] dispatchFamilyAlert error:', err.message))
}
