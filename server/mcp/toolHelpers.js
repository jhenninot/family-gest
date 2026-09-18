// Les outils MCP renvoient leur résultat en JSON textuel (format `content` attendu par le protocole).
// Toute erreur métier doit être levée (throw new Error(...)) : le SDK la convertit automatiquement
// en résultat d'outil `isError: true` sans wrapping supplémentaire nécessaire ici.
export const jsonResult = (data) => ({
  content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
})
