// Tâches privées : visibles et modifiables uniquement par la personne qui les a créées.
// Filtre MongoDB à combiner avec { familyId } partout où l'on lit ou modifie des tâches pour un
// lecteur donné. Sans lecteur identifié (connecteur MCP, skill Alexa, export de la famille…),
// seules les tâches partagées sont accessibles.
export const visibleTasksFilter = (viewerId = null) => (
  viewerId == null
    ? { isPrivate: { $ne: true } }
    : { $or: [{ isPrivate: { $ne: true } }, { createdBy: viewerId }] }
)
