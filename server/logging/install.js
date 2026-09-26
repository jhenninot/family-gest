import { installConsoleCapture, installProcessHandlers } from './logger.js'

// Importé en tout premier par server/index.js : les messages écrits pendant le chargement des
// autres modules et le démarrage sont déjà journalisés.
installConsoleCapture()
installProcessHandlers()
