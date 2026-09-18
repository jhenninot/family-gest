import { getFamilyMembersList } from '../resolveMember.js'
import { jsonResult } from '../toolHelpers.js'

export const registerMemberTools = (server, req) => {
  server.registerTool('list_members', {
    title: 'Lister les membres de la famille',
    description: 'Retourne les membres de la famille (id, nom, rôle, admin, présence habituelle, points). ' +
      "À appeler avant tout outil qui prend un paramètre \"membre\", pour résoudre un nom en id.",
    inputSchema: {}
  }, async () => {
    const members = await getFamilyMembersList(req.family._id)
    return jsonResult(members)
  })
}
