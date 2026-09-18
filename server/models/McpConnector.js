import mongoose from 'mongoose'

// Un connecteur MCP par famille : expose une URL unique (token embarqué dans le chemin) permettant
// à un client MCP (ex: Claude) de piloter les données de la famille sans session utilisateur.
// Le token n'est jamais stocké en clair : seul son empreinte sha256 est conservée (voir server/mcp/auth.js).
const mcpConnectorSchema = new mongoose.Schema({
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, unique: true },
  tokenHash: { type: String, required: true, unique: true, index: true },
  tokenPreview: { type: String, required: true },
  label: { type: String, default: 'Connecteur Claude' },
  createdByUserId: { type: Number, default: null },
  lastUsedAt: { type: Date, default: null },
  requestCount: { type: Number, default: 0 },
  revokedAt: { type: Date, default: null }
}, { timestamps: true })

export default mongoose.model('McpConnector', mcpConnectorSchema)
