import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerMemberTools } from './tools/members.js'
import { registerEventTools } from './tools/events.js'
import { registerAbsenceTools } from './tools/absences.js'
import { registerLongAbsenceTools } from './tools/longAbsences.js'
import { registerMealGuestTools } from './tools/mealGuests.js'
import { registerMealTools } from './tools/meals.js'
import { registerShoppingTools } from './tools/shopping.js'
import { registerTaskTools } from './tools/tasks.js'
import { registerAggregationTools } from './tools/aggregation.js'

// Construit un McpServer scopé à la famille de la requête courante (req.family, posé par mcpAuth).
// Un serveur par requête (mode stateless) : chaque requête HTTP est déjà entièrement scopée par
// l'URL du connecteur, il n'y a aucun état de session à conserver entre deux appels.
export const buildMcpServerForRequest = (req, ctx) => {
  const server = new McpServer({ name: 'familygest', version: '1.0.0' })

  registerMemberTools(server, req, ctx)
  registerEventTools(server, req, ctx)
  registerAbsenceTools(server, req, ctx)
  registerLongAbsenceTools(server, req, ctx)
  registerMealGuestTools(server, req, ctx)
  registerMealTools(server, req, ctx)
  registerShoppingTools(server, req, ctx)
  registerTaskTools(server, req, ctx)
  registerAggregationTools(server, req, ctx)

  return server
}
